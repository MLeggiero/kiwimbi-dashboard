import { countWeekdays, fmtRange, shiftMonths, shiftYears } from '../../shared/dates';
import { METRIC_BY_ID } from '../../shared/metrics';
import type { MetricId } from '../../shared/types';
import type { Dataset } from './dataset';
import { presetRange } from './presets';
import { compareRange, pctChange, rangeStats, type Granularity, type RangeStats } from './series';

// Comparisons in the managers' view: period A against period B. A can be the chart's whole
// date range (then B is drawn over the chart bucket by bucket) or any stretch of its own,
// so a long chart can compare two short periods; B is the period before, the same dates a
// year earlier, or custom dates. Periods of different lengths are compared per day.

/** What A is compared with ("none" turns comparisons off). */
export type CompareMode = 'none' | 'prev' | 'yoy' | 'custom';
/** Which dates are period A. */
export type Focus = 'range' | 'last1w' | 'last2w' | 'last4w' | 'last3m' | 'term' | 'custom';

export const COMPARE_MODES: CompareMode[] = ['none', 'prev', 'yoy', 'custom'];

export const FOCUS_CHOICES: { id: Focus; label: string }[] = [
  { id: 'range', label: 'The chart’s dates' },
  { id: 'last1w', label: 'Last week' },
  { id: 'last2w', label: 'Last 2 weeks' },
  { id: 'last4w', label: 'Last 4 weeks' },
  { id: 'last3m', label: 'Last 3 months' },
  { id: 'term', label: 'This term' },
  { id: 'custom', label: 'Custom dates' },
];

export interface CompareSpec {
  mode: CompareMode;
  focus: Focus;
  /** Dates for a custom period A or B (ignored otherwise). */
  a?: [number, number] | null;
  b?: [number, number] | null;
}

export const NO_COMPARE: CompareSpec = { mode: 'none', focus: 'range' };

export interface Period {
  from: number;
  to: number;
  days: number;
}

export interface Comparison {
  a: Period;
  b: Period;
  /** A is the chart's whole date range. */
  whole: boolean;
  /** Both periods have the same number of days, so totals compare directly. */
  sameLength: boolean;
}

const period = (from: number, to: number): Period => ({ from, to, days: to - from + 1 });

/** Period A's dates. Relative choices ("last 4 weeks") end today, whatever the chart shows. */
export function focusRange(focus: Focus, ds: Dataset, view: [number, number], custom?: [number, number] | null): [number, number] {
  const t = ds.today;
  switch (focus) {
    case 'last1w':
      return [t - 6, t];
    case 'last2w':
      return [t - 13, t];
    case 'last4w':
      return [t - 27, t];
    case 'last3m':
      return [shiftMonths(t, -3) + 1, t];
    case 'term':
      return ds.terms.length ? presetRange('term', ds) : view;
    case 'custom':
      return custom ?? view;
    default:
      return view;
  }
}

/** Period B's dates for a given A. */
export function baselineRange(mode: CompareMode, a: [number, number], whole: boolean, g: Granularity, custom?: [number, number] | null): [number, number] | null {
  if (mode === 'none') return null;
  if (mode === 'custom') return custom ?? baselineRange('prev', a, whole, g);
  // The whole chart keeps the bucket-aligned shifts the overlay line needs.
  if (whole) return compareRange(a[0], a[1], mode, g);
  const len = a[1] - a[0] + 1;
  if (mode === 'prev') return [a[0] - len, a[1] - len];
  // Whole weeks go back 52 weeks so weekdays line up; anything else goes back to the same dates.
  return len % 7 === 0 ? [a[0] - 364, a[1] - 364] : [shiftYears(a[0], -1), shiftYears(a[1], -1)];
}

export function makeComparison(spec: CompareSpec, ds: Dataset, view: [number, number], g: Granularity): Comparison | null {
  if (spec.mode === 'none') return null;
  const [af, at] = focusRange(spec.focus, ds, view, spec.a);
  const a: [number, number] = [Math.min(af, at), Math.max(af, at)];
  const whole = a[0] === view[0] && a[1] === view[1];
  const b = baselineRange(spec.mode, a, whole, g, spec.b);
  if (!b) return null;
  const bp = period(Math.min(b[0], b[1]), Math.max(b[0], b[1]));
  const ap = period(a[0], a[1]);
  return { a: ap, b: bp, whole, sameLength: ap.days === bp.days };
}

export interface MetricComparison {
  a: RangeStats;
  b: RangeStats;
  /** Average per school day (weekday metrics) or per day, over the whole period. */
  aRate: number | null;
  bRate: number | null;
  /** Change in totals (same lengths) or in daily averages; null when unfair to compare. */
  change: number | null;
}

const activeDaysIn = (p: Period, weekdays: boolean) => (weekdays ? countWeekdays(p.from, p.to) : p.days);

export function compareMetrics(ds: Dataset, metrics: MetricId[], c: Comparison): MetricComparison {
  const weekdays = METRIC_BY_ID[metrics[0]]?.activeDays !== 'all';
  const a = rangeStats(ds, metrics, c.a.from, c.a.to);
  const b = rangeStats(ds, metrics, c.b.from, c.b.to);
  const rate = (st: RangeStats, p: Period) => {
    const n = activeDaysIn(p, weekdays);
    return st.coveredDays && n ? st.total / n : null;
  };
  const aRate = rate(a, c.a);
  const bRate = rate(b, c.b);
  let change: number | null;
  if (c.sameLength) change = pctChange(a, b);
  else if (aRate === null || bRate === null || bRate <= 0) change = null;
  // Same fairness rule as pctChange, on the share of each period with reports.
  else change = b.coveredDays / b.days < 0.5 * (a.coveredDays / a.days) ? null : aRate / bRate - 1;
  return { a, b, aRate, bRate, change };
}

/** "4 weeks", "31 days", "1 day". */
export function lengthText(days: number): string {
  if (days % 7 === 0 && days >= 14) return `${days / 7} weeks`;
  return days === 1 ? '1 day' : `${days} days`;
}

export const periodText = (p: Period) => `${fmtRange(p.from, p.to)} (${lengthText(p.days)})`;
