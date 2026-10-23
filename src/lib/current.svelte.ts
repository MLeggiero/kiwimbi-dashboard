import { dayParts, fmtRange, startOfYear } from '../../shared/dates';
import { app } from './state.svelte';
import { readChartTheme, themeState } from './theme.svelte';
import { makeViewContext, type ViewContext } from './view';

/** The view context for the current filters. Call inside $derived so it tracks changes. */
export function currentView(): ViewContext {
  void themeState.version;
  const ds = app.data!;
  const [from, to] = app.range;
  return makeViewContext(ds, from, to, app.granularity, app.view, app.chartSpec, readChartTheme());
}

/** A year-to-date running total compared with last year, whatever the filters say. */
export function raceView(ctx: ViewContext): ViewContext {
  const from = Math.max(startOfYear(ctx.to), ctx.ds.firstDay);
  return makeViewContext(ctx.ds, from, ctx.to, 'week', 'cumulative', { mode: 'yoy', focus: 'range' }, ctx.theme);
}

export const periodWord = (ctx: ViewContext) => (ctx.g === 'week' ? 'week' : ctx.g === 'month' ? 'month' : 'term');

export function targetFor(ctx: ViewContext, key: string): { value: number; year: number } | null {
  const year = dayParts(ctx.to).y;
  const t = ctx.ds.payload.targets.find((x) => x.key === key && x.year === year);
  return t ? { value: t.value, year } : null;
}

export const rangeText = (ctx: ViewContext) => fmtRange(ctx.from, ctx.to);
