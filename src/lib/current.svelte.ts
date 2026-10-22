import { dayParts, fmtRange, startOfWeek, startOfYear } from '../../shared/dates';
import { compareMetrics } from './compare';
import type { SeriesKey } from './dataset';
import type { Basis } from './teaching';
import { lastWeeks, rangeStats, type RangeStats } from './series';
import { app } from './state.svelte';
import { readChartTheme, themeState } from './theme.svelte';
import { makeViewContext, type ViewContext } from './view';

/** The view context for the current filters. Call inside $derived so it tracks changes. */
export function currentView(): ViewContext {
  void themeState.version;
  const ds = app.data!;
  const [from, to] = app.range;
  return makeViewContext(ds, from, to, app.granularity, app.view, app.compareSpec, readChartTheme());
}

/** A year-to-date running total compared with last year, whatever the filters say. */
export function raceView(ctx: ViewContext): ViewContext {
  const from = Math.max(startOfYear(ctx.to), ctx.ds.firstDay);
  return makeViewContext(ctx.ds, from, ctx.to, 'week', 'cumulative', { mode: 'yoy', focus: 'range' }, ctx.theme);
}

/** Last day of the most recent complete week inside the range (the current week is still filling in). */
export function sparkEnd(ctx: ViewContext): number {
  return Math.min(ctx.to, startOfWeek(ctx.ds.today) - 1);
}

export interface Kpi {
  value: number | null;
  stats: RangeStats;
  delta: number | null;
  /** What the change compares (see likeForLike). */
  basis: Basis;
  spark: (number | null)[];
}

export function kpi(ctx: ViewContext, metrics: SeriesKey[]): Kpi {
  const stats = rangeStats(ctx.ds, metrics, ctx.from, ctx.to);
  // Tiles show the chart's dates, so they carry a change only when period A is those dates.
  const c = ctx.comparison?.whole ? ctx.comparison : null;
  const m = c ? compareMetrics(ctx.ds, metrics, c) : null;
  return {
    value: stats.coveredDays ? stats.total : null,
    stats,
    delta: m?.change ?? null,
    basis: m?.basis ?? 'all',
    spark: lastWeeks(ctx.ds, metrics, sparkEnd(ctx), 12),
  };
}

export function deltaLabel(ctx: ViewContext): string {
  const c = ctx.comparison;
  if (!c?.whole) return '';
  const base = ctx.compare === 'yoy' ? 'vs last year' : ctx.compare === 'prev' ? 'vs previous period' : 'vs period B';
  return c.sameLength ? base : `${base}, per day`;
}

export const periodWord = (ctx: ViewContext) => (ctx.g === 'week' ? 'week' : ctx.g === 'month' ? 'month' : 'term');

export function targetFor(ctx: ViewContext, key: string): { value: number; year: number } | null {
  const year = dayParts(ctx.to).y;
  const t = ctx.ds.payload.targets.find((x) => x.key === key && x.year === year);
  return t ? { value: t.value, year } : null;
}

export const rangeText = (ctx: ViewContext) => fmtRange(ctx.from, ctx.to);
