import { MEAL_SCHOOLS, TEACHING_METRICS } from '../../shared/metrics';
import { dayParts, fmtDayShort, startOfYear } from '../../shared/dates';
import type { Dataset, SeriesKey } from './dataset';
import { fmtInt } from './format';
import { rangeStats } from './series';

const THRESHOLDS: { metrics: SeriesKey[]; unit: string; steps: number[] }[] = [
  { metrics: MEAL_SCHOOLS, unit: 'school meals served', steps: [10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 300_000] },
  { metrics: ['books_checked_out'], unit: 'books checked out', steps: [2_500, 5_000, 10_000, 20_000, 40_000] },
  { metrics: TEACHING_METRICS, unit: 'teaching contact hours', steps: [1_000, 2_500, 5_000, 10_000, 25_000, 50_000] },
];

/** Round-number milestones crossed so far this year (highest per metric). Rule-based; no data leaves the page. */
export function milestones(ds: Dataset): { key: string; text: string }[] {
  const yearStart = startOfYear(ds.today);
  const from = Math.max(yearStart, ds.firstDay);
  const year = dayParts(ds.today).y;
  const when = from > yearStart ? `since ${fmtDayShort(from)}` : `so far in ${year}`;
  const out: { key: string; text: string }[] = [];
  for (const t of THRESHOLDS) {
    const total = rangeStats(ds, t.metrics, from, ds.today).total;
    const hit = [...t.steps].reverse().find((s) => total >= s);
    if (hit) out.push({ key: `${year}-${t.unit}-${hit}`, text: `Over ${fmtInt(hit)} ${t.unit} ${when}.` });
  }
  return out;
}
