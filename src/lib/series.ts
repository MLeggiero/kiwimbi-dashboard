import { countWeekdays, dayParts, fmtDayShort, fmtRange, isoToDay, monthName, shiftYears, startOfMonth, startOfNextMonth, startOfWeek, weekdayIndex } from '../../shared/dates';
import type { ActiveDays, MetricId } from '../../shared/types';
import type { Dataset, SeriesKey } from './dataset';

export type Granularity = 'week' | 'month' | 'term';

export interface Bucket {
  start: number;
  end: number;
  /** Axis label. */
  label: string;
  /** Tooltip title. */
  title: string;
  /** Clipped by the selected range. */
  partial: boolean;
  kind?: 'term' | 'break';
}

type Terms = Dataset['terms'];

export function makeBuckets(from: number, to: number, g: Granularity, terms: Terms): Bucket[] {
  const out: Bucket[] = [];
  if (to < from) return out;
  if (g === 'week') {
    for (let ws = startOfWeek(from); ws <= to; ws += 7) {
      const s = Math.max(ws, from);
      const e = Math.min(ws + 6, to);
      const partial = s !== ws || e !== ws + 6;
      out.push({ start: s, end: e, label: fmtDayShort(s), title: `Week of ${fmtRange(s, e)}${partial ? ' (part of the week)' : ''}`, partial });
    }
    return out;
  }
  if (g === 'month') {
    const multiYear = dayParts(from).y !== dayParts(to).y;
    for (let ms = startOfMonth(from); ms <= to; ms = startOfNextMonth(ms)) {
      const s = Math.max(ms, from);
      const e = Math.min(startOfNextMonth(ms) - 1, to);
      const { y, m } = dayParts(ms);
      const partial = s !== ms || e !== startOfNextMonth(ms) - 1;
      out.push({ start: s, end: e, label: multiYear ? `${monthName(m)} ’${String(y).slice(2)}` : monthName(m), title: `${monthName(m)} ${y}${partial ? ' (part of the month)' : ''}`, partial });
    }
    return out;
  }
  const sorted = [...terms].sort((a, b) => a.start - b.start).filter((t) => t.end >= from && t.start <= to);
  if (!sorted.length) return makeBuckets(from, to, 'month', terms);
  let cursor = from;
  const pushBreak = (s: number, e: number) => out.push({ start: s, end: e, label: 'Break', title: `School break: ${fmtRange(s, e)}`, partial: false, kind: 'break' });
  for (const t of sorted) {
    const s = Math.max(t.start, from);
    const e = Math.min(t.end, to);
    if (s > cursor) pushBreak(cursor, s - 1);
    out.push({ start: s, end: e, label: t.label, title: `${t.label}: ${fmtRange(s, e)}`, partial: s !== t.start || e !== t.end, kind: 'term' });
    cursor = e + 1;
  }
  if (cursor <= to) pushBreak(cursor, to);
  return out;
}

export interface RangeStats {
  total: number;
  days: number;
  coveredDays: number;
  coveredWeekdays: number;
}

export function rangeStats(ds: Dataset, metrics: readonly SeriesKey[], from: number, to: number): RangeStats {
  let total = 0;
  let coveredDays = 0;
  let coveredWeekdays = 0;
  for (let d = from; d <= to; d++) {
    const i = d - ds.origin;
    if (i < 0 || i >= ds.length) continue;
    let covered = false;
    for (const m of metrics) {
      const s = ds.daily[m];
      if (!s) continue;
      total += s.values[i];
      if (s.covered[i]) covered = true;
    }
    if (covered) {
      coveredDays++;
      if (weekdayIndex(d) < 5) coveredWeekdays++;
    }
  }
  return { total, days: Math.max(0, to - from + 1), coveredDays, coveredWeekdays };
}

/** Bucket totals. A bucket no report covers is null ("no reports"), never 0. */
export function aggregate(ds: Dataset, metrics: readonly SeriesKey[], buckets: Bucket[]): { values: (number | null)[]; coverage: number[] } {
  const values: (number | null)[] = [];
  const coverage: number[] = [];
  for (const b of buckets) {
    const st = rangeStats(ds, metrics, b.start, b.end);
    values.push(st.coveredDays > 0 ? st.total : null);
    coverage.push(b.end >= b.start ? st.coveredDays / (b.end - b.start + 1) : 0);
  }
  return { values, coverage };
}

/** Trailing average over the last `window` buckets that have reports. Null where the bucket itself has none. */
export function rolling(values: (number | null)[], window: number): (number | null)[] {
  return values.map((v, i) => {
    if (v === null) return null;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const x = values[j];
      if (x !== null) {
        sum += x;
        n++;
      }
    }
    return n ? sum / n : null;
  });
}

export function cumulative(values: (number | null)[]): number[] {
  let run = 0;
  return values.map((v) => (run += v ?? 0));
}

/** Per school day (weekday metrics) or per day (all-days metrics). */
export function perActiveDay(values: (number | null)[], buckets: Bucket[], mode: ActiveDays): (number | null)[] {
  return values.map((v, i) => {
    if (v === null) return null;
    const b = buckets[i];
    const n = mode === 'weekdays' ? countWeekdays(b.start, b.end) : b.end - b.start + 1;
    return n > 0 ? v / n : null;
  });
}

/** The comparison window for a range: previous period of the same length, or the same period last year. */
export function compareRange(from: number, to: number, mode: 'none' | 'prev' | 'yoy', g: Granularity): [number, number] | null {
  if (mode === 'none') return null;
  if (mode === 'yoy') return g === 'month' ? [shiftYears(from, -1), shiftYears(to, -1)] : [from - 364, to - 364];
  const len = to - from + 1;
  const shift = g === 'week' ? Math.ceil(len / 7) * 7 : len;
  return [from - shift, to - shift];
}

/** Percent change, or null when either period has too few reports to compare fairly. */
export function pctChange(cur: RangeStats, prev: RangeStats): number | null {
  if (!cur.coveredDays || !prev.coveredDays) return null;
  if (prev.coveredDays < 0.5 * cur.coveredDays) return null;
  if (prev.total <= 0) return null;
  return (cur.total - prev.total) / prev.total;
}

/**
 * Buckets that fall entirely in a school break. Only marked between known terms, so
 * years without a term calendar are never shaded.
 */
export function holidayFlags(buckets: Bucket[], terms: Terms): boolean[] {
  if (!terms.length) return buckets.map(() => false);
  const first = Math.min(...terms.map((t) => t.start));
  const last = Math.max(...terms.map((t) => t.end));
  return buckets.map((b) => {
    if (b.kind) return b.kind === 'break';
    if (b.start < first || b.end > last) return false;
    for (let d = b.start; d <= b.end; d++) {
      if (weekdayIndex(d) >= 5) continue;
      if (terms.some((t) => d >= t.start && d <= t.end)) return false;
    }
    return true;
  });
}

/** Weekly totals for the `n` weeks ending with the week containing `end` (sparklines). */
export function lastWeeks(ds: Dataset, metrics: readonly SeriesKey[], end: number, n: number): (number | null)[] {
  const lastStart = startOfWeek(end);
  const buckets = makeBuckets(lastStart - 7 * (n - 1), lastStart + 6, 'week', []);
  return aggregate(ds, metrics, buckets).values;
}

export function autoGranularity(from: number, to: number): Granularity {
  return to - from > 400 ? 'month' : 'week';
}

export function rollingWindow(g: Granularity): number {
  return g === 'week' ? 4 : g === 'month' ? 3 : 1;
}

/** Median value of single-week (or shorter) reports overlapping the range. */
export function typicalWeekly(ds: Dataset, metric: MetricId, from: number, to: number): number | null {
  const vals = ds.facts[metric]
    .filter((f) => isoToDay(f.e) >= from && isoToDay(f.s) <= to && isoToDay(f.e) - isoToDay(f.s) <= 6)
    .map((f) => f.v)
    .sort((a, b) => a - b);
  if (!vals.length) return null;
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

export function reportsInRange(ds: Dataset, metrics: MetricId[], from: number, to: number): number {
  let n = 0;
  for (const m of metrics) for (const f of ds.facts[m]) if (isoToDay(f.e) >= from && isoToDay(f.s) <= to) n++;
  return n;
}
