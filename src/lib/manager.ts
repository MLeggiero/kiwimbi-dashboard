import { CLASS_METRICS, ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID, STREAMS } from '../../shared/metrics';
import { isoToDay } from '../../shared/dates';
import type { MetricId } from '../../shared/types';
import type { Dataset } from './dataset';
import { lastActivityOf } from './dataset';
import { fmtInt, fmtOne } from './format';
import { aggregate, makeBuckets, pctChange, rangeStats, typicalWeekly, type Bucket } from './series';
import type { ViewContext } from './view';

// The managers' dashboard: a few explanatory charts per page, each with a one-line
// takeaway as its title. Pure functions of the data and the current filters.

const pct = (c: number) => `${Math.round(Math.abs(c) * 100)}%`;
const sameStretchLastYear = (ctx: ViewContext) => (ctx.cmp && ctx.compare === 'yoy' ? ctx.cmp : { from: shiftBack(ctx.from), to: shiftBack(ctx.to) });
const shiftBack = (d: number) => d - 364;

/** Change against the same weeks a year earlier (52 weeks back, so weekdays line up); null unless fair. */
export function yearChange(ds: Dataset, metrics: MetricId[], from: number, to: number): number | null {
  return pctChange(rangeStats(ds, metrics, from, to), rangeStats(ds, metrics, shiftBack(from), shiftBack(to)));
}

/** "About 1,900 school meals a week": the average of complete periods with reports. */
export function typicalPeriod(ctx: ViewContext, metrics: MetricId[]): number | null {
  const lagStart = ctx.ds.today - 13;
  const vals = aggregate(ctx.ds, metrics, ctx.buckets).values.filter((v, i): v is number => v !== null && !ctx.buckets[i].partial && ctx.buckets[i].end < lagStart);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export const periodNoun = (ctx: ViewContext) => (ctx.g === 'week' ? 'week' : ctx.g === 'month' ? 'month' : 'term');

// ------------------------------------------------------------------ overview: change vs last year

export interface ChangeRow {
  label: string;
  change: number | null;
  total: number;
}

const HEADLINES: { label: string; metrics: MetricId[] }[] = [
  { label: 'School meals', metrics: MEAL_SCHOOLS },
  { label: 'Library visits', metrics: ['library_visits'] },
  { label: 'Books checked out', metrics: ['books_checked_out'] },
  { label: 'Mentorship classes', metrics: CLASS_METRICS },
  { label: 'Program attendances', metrics: ENRICHMENT },
];

export function headlineChanges(ctx: ViewContext): ChangeRow[] {
  return HEADLINES.map((h) => ({ label: h.label, change: yearChange(ctx.ds, h.metrics, ctx.from, ctx.to), total: rangeStats(ctx.ds, h.metrics, ctx.from, ctx.to).total }));
}

export function changesTakeaway(rows: ChangeRow[]): string {
  const known = rows.filter((r): r is ChangeRow & { change: number } => r.change !== null);
  if (!known.length) return 'Not enough reports from last year to compare yet';
  const up = known.filter((r) => r.change >= 0.02);
  const down = known.filter((r) => r.change <= -0.02);
  const top = [...known].sort((a, b) => b.change - a.change)[0];
  const low = [...known].sort((a, b) => a.change - b.change)[0];
  if (!down.length) return `Everything is up or level on last year, led by ${top.label.toLowerCase()} (+${pct(top.change)})`;
  if (!up.length) return `Everything is down or level on last year; ${low.label.toLowerCase()} fell most (−${pct(low.change)})`;
  return `${top.label} up ${pct(top.change)} on last year; ${low.label.toLowerCase()} down ${pct(low.change)}`;
}

// ------------------------------------------------------------------ overview: reporting grid

export interface GridRow {
  label: string;
  /** Per column: value (null = no reports). */
  cells: (number | null)[];
  note?: string;
}

/** Which programs reported in each of the last 12 weeks (or since the first report, if that is sooner). */
export function reportingGrid(ds: Dataset): { weeks: Bucket[]; rows: GridRow[]; takeaway: string } {
  const end = ds.today;
  const weeks = makeBuckets(Math.max(end - 7 * 11, ds.firstDay), end, 'week', []);
  const rows: GridRow[] = STREAMS.map((s) => {
    const last = lastActivityOf(ds, s.metrics);
    return { label: s.label, cells: aggregate(ds, s.metrics, weeks).values, note: last === null ? 'never' : `${Math.max(0, ds.today - last)} d ago` };
  });
  const regular = rows.filter((r) => !/Holiday|Agronomy/.test(r.label));
  const quiet = regular.filter((r) => r.cells.slice(-3).every((v) => v === null)).map((r) => r.label.toLowerCase());
  const takeaway = quiet.length === 0 ? 'Every regular program has reported in the last three weeks' : `${quiet.length === 1 ? 'One program has' : `${quiet.length} programs have`} no reports in the last three weeks: ${quiet.join(', ')}`;
  return { weeks, rows, takeaway };
}

// ------------------------------------------------------------------ meals by school

export interface SchoolRow {
  label: string;
  total: number;
  perSchoolDay: number | null;
  change: number | null;
}

export function schoolRows(ctx: ViewContext): SchoolRow[] {
  const { ds, from, to } = ctx;
  return MEAL_SCHOOLS.map((m) => {
    const st = rangeStats(ds, [m], from, to);
    return { label: METRIC_BY_ID[m].short, total: st.total, perSchoolDay: st.coveredWeekdays ? st.total / st.coveredWeekdays : null, change: yearChange(ds, [m], from, to) };
  });
}

export function schoolsTakeaway(rows: SchoolRow[]): string {
  const known = rows.filter((r): r is SchoolRow & { change: number } => r.change !== null);
  if (known.length >= 2) {
    const top = [...known].sort((a, b) => b.change - a.change)[0];
    const low = [...known].sort((a, b) => a.change - b.change)[0];
    if (top.change > 0.02 && low.change < -0.02) return `${top.label} grew most (+${pct(top.change)}); ${low.label} fell ${pct(low.change)} on last year`;
    if (top.change > 0.02) return `All three schools are up or level on last year; ${top.label} grew most (+${pct(top.change)})`;
    return `${low.label} fell most on last year (−${pct(low.change)})`;
  }
  const withRate = rows.filter((r): r is SchoolRow & { perSchoolDay: number } => r.perSchoolDay !== null);
  if (!withRate.length) return 'No school meals reported in this range';
  const top = [...withRate].sort((a, b) => b.perSchoolDay - a.perSchoolDay)[0];
  return `${top.label} serves the most meals on a school day (about ${fmtInt(top.perSchoolDay)})`;
}

// ------------------------------------------------------------------ running totals

/** "18% ahead of last year, and 3% ahead of the 90,000 target pace". */
export function raceTakeaway(ctx: ViewContext, metrics: MetricId[], noun: string, target: { value: number; year: number } | null): string {
  const c = yearChange(ctx.ds, metrics, ctx.from, ctx.to);
  const total = rangeStats(ctx.ds, metrics, ctx.from, ctx.to).total;
  let text = c === null ? `${fmtInt(total)} ${noun} so far` : Math.abs(c) < 0.02 ? `Level with last year at ${fmtInt(total)} ${noun}` : `${pct(c)} ${c > 0 ? 'ahead of' : 'behind'} last year, at ${fmtInt(total)} ${noun}`;
  if (target) {
    const yearStart = isoToDay(`${target.year}-01-01`);
    const yearDays = isoToDay(`${target.year + 1}-01-01`) - yearStart;
    const pace = (target.value * (Math.min(ctx.to, yearStart + yearDays - 1) - yearStart + 1)) / yearDays;
    if (pace > 0 && ctx.from === yearStart) {
      const vsPace = total / pace - 1;
      text += Math.abs(vsPace) < 0.02 ? ', on target pace' : `, ${pct(vsPace)} ${vsPace > 0 ? 'ahead of' : 'behind'} target pace`;
    }
  }
  return text;
}

// ------------------------------------------------------------------ programs

export interface ProgramRow {
  id: MetricId;
  label: string;
  total: number;
  typical: number | null;
  /** Periods (columns) with any attendance. */
  active: number;
  cells: (number | null)[];
}

export function programRows(ctx: ViewContext): ProgramRow[] {
  const { ds, from, to, buckets } = ctx;
  return ENRICHMENT.map((m) => {
    const cells = aggregate(ds, [m], buckets).values;
    return { id: m, label: METRIC_BY_ID[m].short, total: rangeStats(ds, [m], from, to).total, typical: typicalWeekly(ds, m, from, to), active: cells.filter((v) => v !== null).length, cells };
  }).sort((a, b) => b.total - a.total);
}

export function programsTakeaway(rows: ProgramRow[], periods: number, word: string): string {
  const running = rows.filter((r) => r.total > 0);
  if (!running.length) return 'No program sessions reported in this range';
  const most = [...running].sort((a, b) => b.active - a.active)[0];
  const all = running.reduce((a, r) => a + r.total, 0);
  const share = Math.round((running[0].total / all) * 100);
  if (most === running[0]) return `${most.label} ran in ${most.active} of ${periods} ${word}s and drew ${share}% of attendances`;
  return `${most.label} ran in ${most.active} of ${periods} ${word}s; ${running[0].label} drew ${share}% of attendances`;
}

/** Which program reaches the most students in a typical week. */
export function reachTakeaway(rows: ProgramRow[]): string {
  const withTypical = rows.filter((r): r is ProgramRow & { typical: number } => r.typical !== null && r.total > 0);
  if (!withTypical.length) return 'Attendances by program';
  const top = [...withTypical].sort((a, b) => b.typical - a.typical)[0];
  return `${top.label} reaches the most students: about ${fmtInt(top.typical)} in a typical week`;
}

export function libraryTakeaway(ctx: ViewContext): string {
  const v = typicalPeriod(ctx, ['library_visits']);
  const b = typicalPeriod(ctx, ['books_checked_out']);
  const word = periodNoun(ctx);
  if (v === null) return 'No library visits reported in this range';
  return `About ${fmtInt(v)} visits${b !== null ? ` and ${fmtInt(b)} books borrowed` : ''} in a typical ${word}`;
}

export function ratioTakeaway(ctx: ViewContext): string {
  const v = rangeStats(ctx.ds, ['library_visits'], ctx.from, ctx.to).total;
  const b = rangeStats(ctx.ds, ['books_checked_out'], ctx.from, ctx.to).total;
  if (!v) return 'Books per visit';
  const r = b / v;
  const prev = sameStretchLastYear(ctx);
  const pv = rangeStats(ctx.ds, ['library_visits'], prev.from, prev.to).total;
  const pb = rangeStats(ctx.ds, ['books_checked_out'], prev.from, prev.to).total;
  const base = r >= 1 ? `Readers borrow about ${fmtOne(r)} books per visit` : `Readers borrow about one book for every ${Math.round(1 / r)} visits`;
  if (!pv || !pb) return base;
  const was = pb / pv;
  return Math.abs(r - was) < 0.03 ? `${base}, about the same as last year` : `${base}, ${r > was ? 'up' : 'down'} from ${fmtOne(was)} per visit last year`;
}
