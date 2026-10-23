import { countWeekdays, dayParts, fmtDay, fmtDayShort, fmtRange, shiftYears, startOfMonth, startOfWeek, startOfYear } from '../../shared/dates';
import { METRIC_BY_ID } from '../../shared/metrics';
import { baseMetric, type Dataset, type SeriesKey } from './dataset';
import { fmtInt, plural } from './format';
import { breakNote, mostlyBreak, rangeStats } from './series';
import type { PageId } from './state.svelte';
import { monthLong } from './story';
import { likeForLike, type Basis } from './teaching';

// The managers' highlights: the latest full week, the latest full month and the year so far,
// each against the period before. Every change is shown when both periods have figures;
// school breaks and where the figures start are explained in words beside it.

export interface HighlightPeriod {
  id: 'week' | 'month' | 'year';
  /** "Last week", "Last month", "This year so far". */
  title: string;
  /** "Oct 12 – 18, 2026", "September". */
  when: string;
  /** What it is compared with, as it reads in a sentence: "the week before", "August". */
  vs: string;
  /** The same, short, for "no figures for …": "the week before", "August", "2025". */
  vsShort: string;
  /** Where each period sits in a sentence: "last week" / "the week before", "in September" / "in August". */
  inA: string;
  inB: string;
  a: [number, number];
  b: [number, number];
  /** The earlier period is mostly a school break (its note says so). */
  bBreak: boolean;
  /** School breaks and the start of the figures, in words. */
  notes: string[];
}

export interface HighlightRow {
  label: string;
  metrics: SeriesKey[];
  /** The page the row opens (Overview). */
  page?: PageId;
  /** Part of the row above it (one school under its program). */
  indent?: boolean;
}

export function highlightPeriods(ds: Dataset): HighlightPeriod[] {
  const t = ds.today;
  const y = dayParts(t).y;
  const wk = startOfWeek(t) - 7;
  const thisMonth = startOfMonth(t);
  const lastMonth = startOfMonth(thisMonth - 1);
  const monthBefore = startOfMonth(lastMonth - 1);
  const month = (d: number) => `${monthLong(dayParts(d).m)}${dayParts(d).y === y ? '' : ` ${dayParts(d).y}`}`;
  const ys = Math.max(startOfYear(t), ds.firstDay);
  const sinceJan = ys === startOfYear(t);
  const periods: Omit<HighlightPeriod, 'notes' | 'bBreak'>[] = [
    { id: 'week', title: 'Last week', when: fmtRange(wk, wk + 6), vs: 'the week before', vsShort: 'the week before', inA: 'last week', inB: 'the week before', a: [wk, wk + 6], b: [wk - 7, wk - 1] },
    { id: 'month', title: 'Last month', when: month(lastMonth), vs: month(monthBefore), vsShort: month(monthBefore), inA: `in ${month(lastMonth)}`, inB: `in ${month(monthBefore)}`, a: [lastMonth, thisMonth - 1], b: [monthBefore, lastMonth - 1] },
    {
      id: 'year',
      title: sinceJan ? 'This year so far' : `Since ${fmtDayShort(ys)}`,
      when: fmtRange(ys, t),
      vs: `the same dates in ${y - 1}`,
      vsShort: String(y - 1),
      inA: sinceJan ? 'this year' : `since ${fmtDayShort(ys)}`,
      inB: `in ${y - 1}`,
      a: [ys, t],
      b: [shiftYears(ys, -1), shiftYears(t, -1)],
    },
  ];
  return periods.map((p) => ({ ...p, bBreak: p.id !== 'year' && mostlyBreak(p.b[0], p.b[1], ds.terms), notes: periodNotes(ds, p) }));
}

function periodNotes(ds: Dataset, p: Omit<HighlightPeriod, 'notes' | 'bBreak'>): string[] {
  const out: string[] = [];
  // A year always takes in the same breaks as the year before, so only weeks and months say so.
  if (p.id !== 'year') {
    const [aName, bName] = p.id === 'week' ? ['Last week', 'The week before'] : [p.when, p.vs];
    for (const n of [breakNote(aName, p.a[0], p.a[1], ds.terms), breakNote(bName, p.b[0], p.b[1], ds.terms)]) if (n) out.push(n);
  }
  if (ds.firstDay > Math.min(p.a[0], p.b[0]) + 7) out.push(`Figures start ${fmtDay(ds.firstDay)}.`);
  return out;
}

const onSchoolDays = (metrics: readonly SeriesKey[]) => metrics.every((k) => METRIC_BY_ID[baseMetric(k)].activeDays === 'weekdays');

export interface PeriodChange {
  /** Total in each period; null when nothing was recorded. */
  a: number | null;
  b: number | null;
  /** Worked out whenever both periods have figures; null only when there is nothing to compare with. */
  change: number | null;
  /** Contact hours across the switch from lesson counts compare classroom hours only (see likeForLike). */
  basis: Basis;
  /** Days with figures in each period. */
  aDays: number;
  bDays: number;
}

/**
 * Period A against period B for one measure. Unlike the takeaway titles, the change is always
 * worked out when both periods have figures: breaks and gaps are explained, never hidden.
 * With `perDay`, periods of different lengths compare daily averages.
 */
export function periodChange(ds: Dataset, metrics: readonly SeriesKey[], a: [number, number], b: [number, number], perDay = false): PeriodChange {
  const sa = rangeStats(ds, metrics, a[0], a[1]);
  const sb = rangeStats(ds, metrics, b[0], b[1]);
  const like = likeForLike(ds, metrics, a, b);
  const ca = like.basis === 'all' ? sa : rangeStats(ds, like.keys, a[0], a[1]);
  const cb = like.basis === 'all' ? sb : rangeStats(ds, like.keys, b[0], b[1]);
  const days = (p: [number, number]) => (onSchoolDays(metrics) ? countWeekdays(p[0], p[1]) : p[1] - p[0] + 1) || 1;
  const va = perDay ? ca.total / days(a) : ca.total;
  const vb = perDay ? cb.total / days(b) : cb.total;
  const change = like.basis !== 'new' && ca.coveredDays && cb.coveredDays && vb > 0 ? va / vb - 1 : null;
  return { a: sa.coveredDays ? sa.total : null, b: sb.coveredDays ? sb.total : null, change, basis: like.basis, aDays: sa.coveredDays, bDays: sb.coveredDays };
}

export interface Highlight extends PeriodChange {
  /** Average per school day with figures (school-day measures only). */
  perSchoolDay: number | null;
}

export function highlight(ds: Dataset, metrics: readonly SeriesKey[], p: HighlightPeriod): Highlight {
  const st = rangeStats(ds, metrics, p.a[0], p.a[1]);
  return { ...periodChange(ds, metrics, p.a, p.b), perSchoolDay: onSchoolDays(metrics) && st.coveredWeekdays ? st.total / st.coveredWeekdays : null };
}

/**
 * Explains a change worked out on few figures: "only 8 days with figures in 2025, against
 * 200 this year". Null when the figures are comparable, or a school break already explains it.
 */
export function thinNote(c: PeriodChange, inA: string, inB: string, bBreak = false): string | null {
  if (c.change === null || bBreak || c.bDays >= 0.5 * c.aDays) return null;
  return `only ${plural(c.bDays, 'day')} with figures ${inB}, against ${fmtInt(c.aDays)} ${inA}`;
}

/** For colors: up, down, or the same (within 3%). */
export const changeTone = (c: number) => (Math.abs(c) < 0.03 ? 'same' : c > 0 ? 'up' : 'down');

/** "45% more than the week before", "about the same as August (2% fewer)". */
export function changeText(c: number, vs: string): string {
  const pct = Math.round(Math.abs(c) * 100);
  const word = c > 0 ? 'more' : 'fewer';
  if (Math.abs(c) < 0.03) return pct === 0 ? `the same as ${vs}` : `about the same as ${vs} (${pct}% ${word})`;
  return `${pct}% ${word} than ${vs}`;
}
