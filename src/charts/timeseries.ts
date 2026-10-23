import { fmtRange, ymdToDay } from '../../shared/dates';
import type { ActiveDays } from '../../shared/types';
import type { SeriesKey } from '../lib/dataset';
import type { TableData } from '../lib/download';
import type { EChartsCoreOption } from '../lib/echarts';
import { fmtCompact, fmtInt, fmtOne } from '../lib/format';
import { aggregate, cumulative, perActiveDay, rolling, rollingWindow } from '../lib/series';
import type { ViewContext } from '../lib/view';
import { asParams, bandSeries, baseOption, ESTIMATED_LABEL, estimatedColor, estimatedItemStyle, estimatedLegend, numericValue, timeXAxes, tipNote, tipRow, tipTitle, tooltipBase, valueYAxes, type LegendItem } from './common';

export interface SeriesSpec {
  name: string;
  color: string;
  metrics: SeriesKey[];
  /** With `grouped`: series sharing a stack name stack into one bar (books by location). */
  stack?: string;
}

export interface ChartResult {
  option: EChartsCoreOption;
  table: TableData;
  legend: LegendItem[];
  summary: string;
  empty: boolean;
}

export interface TimeSeriesInput {
  ctx: ViewContext;
  title: string;
  series: SeriesSpec[];
  unit: string;
  activeDays: ActiveDays;
  /** Side-by-side bars (two comparable measures) instead of a stack. */
  grouped?: boolean;
  /** Annual target: drawn as a pace line in the running-total view when the range starts on Jan 1. */
  target?: { value: number; year: number } | null;
  /** The estimated part of a single series (contact hours from old lesson counts), drawn in the estimated style. */
  estimated?: SeriesKey[];
  /** Extra columns for the table and CSV only, kept off the chart (library lessons). */
  tableOnly?: SeriesSpec[];
}

type Vals = (number | null)[];

const align = (vals: Vals, n: number): Vals => Array.from({ length: n }, (_, i) => (i < vals.length ? vals[i] : null));

/**
 * The dashboard's main chart: weekly (or monthly / per-term) bars with a rolling-average
 * trend line, a running-total view, or a per-school-day rate view. School breaks are
 * shaded, weeks with no reports are hatched (never drawn as zero), and the most recent
 * weeks are marked as still coming in.
 */
export function buildTimeSeries(inp: TimeSeriesInput): ChartResult {
  const { ctx, series, unit, activeDays } = inp;
  const { buckets, theme, g, view } = ctx;
  const n = buckets.length;
  const metrics = series.flatMap((s) => s.metrics);
  const totalRaw = aggregate(ctx.ds, metrics, buckets).values;
  const noReports = totalRaw.map((v) => v === null);
  const empty = totalRaw.every((v) => v === null);
  const prov = ctx.provisionalFrom;
  const isProv = (i: number) => prov !== null && i >= prov;
  const rate = view === 'rate';
  const fmt = rate ? fmtOne : fmtInt;
  const round = (v: number | null) => (v === null ? null : rate ? Math.round(v * 10) / 10 : Math.round(v));
  const cmpRaw = ctx.cmp ? align(aggregate(ctx.ds, metrics, ctx.cmp.buckets).values, n) : null;
  // Contact hours estimated from old lesson counts get the estimated style (single-series charts).
  const estRaw = inp.estimated && series.length === 1 ? aggregate(ctx.ds, inp.estimated, buckets).values : null;
  const hasEst = !!estRaw?.some((v) => v !== null && v > 0);
  const cmpEst = !!(inp.estimated && ctx.cmp && aggregate(ctx.ds, inp.estimated, ctx.cmp.buckets).values.some((v) => v !== null && v > 0));

  const out: Record<string, unknown>[] = [bandSeries(buckets, ctx.holidays, noReports, theme)];
  const legend: LegendItem[] = [];
  const columns = ['Period'];
  const rows: (string | number | null)[][] = buckets.map((b) => [b.title]);
  const addColumn = (name: string, vals: Vals) => {
    columns.push(name);
    vals.forEach((v, i) => rows[i].push(round(v)));
  };

  const line = (color: string, dotted = false) => ({ color, width: 2, type: dotted ? [2, 4] : 'solid', cap: 'round', join: 'round' });
  const smooth = { smooth: 0.3, smoothMonotone: 'x', showSymbol: true, symbol: 'circle', symbolSize: 0, connectNulls: false };
  /** A value with no neighbours draws no line segment, so give it a visible dot. */
  const dots = (vals: Vals) => vals.map((v, i) => (v !== null && (vals[i - 1] ?? null) === null && (vals[i + 1] ?? null) === null ? { value: v, symbolSize: 6 } : v));
  /** Split a line at the provisional boundary into solid + dotted parts that meet at one point. */
  const withProvisional = (id: string, name: string, vals: Vals, color: string, z: number, extra: Record<string, unknown> = {}) => {
    const split = prov !== null && prov > 0;
    out.push({ id, name, type: 'line', data: dots(split ? vals.map((v, i) => (i < prov! ? v : null)) : prov === 0 ? [] : vals), lineStyle: line(color), itemStyle: { color }, z, ...smooth, ...extra });
    if (prov !== null) out.push({ id: `${id}-prov`, name, type: 'line', data: dots(vals.map((v, i) => (i >= Math.max(0, prov! - 1) ? v : null))), lineStyle: line(color, true), itemStyle: { color }, z, ...smooth });
  };

  if (view === 'cumulative') {
    const color = series.length === 1 ? series[0].color : theme.series[0];
    const run = cumulative(totalRaw);
    withProvisional('run', 'Running total', run, color, 4, { areaStyle: { color, opacity: 0.1 } });
    legend.push({ label: 'Running total', color, kind: 'area' });
    addColumn('Running total', run);
    if (hasEst && estRaw) {
      // Redraw the stretch built from estimated weeks in the estimated style.
      const isEst = (i: number) => (estRaw[i] ?? 0) > 0;
      const part = run.map((v, i) => (isEst(i) || (i > 0 && isEst(i - 1)) ? v : null));
      out.push({ id: 'run-est', name: ESTIMATED_LABEL, type: 'line', data: part, lineStyle: { color: estimatedColor(color, theme), width: 3, type: [5, 3] }, itemStyle: { color: estimatedColor(color, theme) }, z: 5, ...smooth });
      legend.push(estimatedLegend(color, theme));
      addColumn(`${ESTIMATED_LABEL} (running total)`, cumulative(estRaw));
    }
    if (cmpRaw && ctx.cmp) {
      const cr = cumulative(cmpRaw).map((v, i) => (i < ctx.cmp!.buckets.length ? v : null));
      out.push({ id: 'ghost', name: ctx.cmp.label, type: 'line', data: cr, lineStyle: { color: theme.ghost, width: 2, type: cmpEst ? [5, 3] : 'solid' }, itemStyle: { color: theme.ghost }, z: 3, ...smooth });
      if (cmpEst && !hasEst) legend.push(estimatedLegend(color, theme));
      legend.push({ label: ctx.cmp.label, color: theme.ghost, kind: 'ghost' });
      addColumn(ctx.cmp.label, cr);
    }
    const t = inp.target;
    if (t && ctx.from === ymdToDay(t.year, 1, 1)) {
      const yearDays = ymdToDay(t.year + 1, 1, 1) - ctx.from;
      const pace = buckets.map((b) => (t.value * (b.end - ctx.from + 1)) / yearDays);
      out.push({ id: 'target', name: `Target pace (${fmtInt(t.value)} for ${t.year})`, type: 'line', data: pace, showSymbol: false, lineStyle: { color: theme.ink3, width: 1.5, type: [6, 4] }, itemStyle: { color: theme.ink3 }, z: 2 });
      legend.push({ label: `Target pace (${fmtCompact(t.value)} in ${t.year})`, color: theme.ink3, kind: 'target' });
      addColumn('Target pace', pace);
    }
  } else {
    const tx = (vals: Vals) => (rate ? perActiveDay(vals, buckets, activeDays) : vals);
    series.forEach((s, si) => {
      const all = tx(aggregate(ctx.ds, s.metrics, buckets).values);
      const est = hasEst && estRaw ? tx(estRaw) : null;
      // With estimated weeks, the bar splits into reported (below) and estimated (above).
      const vals = est ? all.map((v, i) => (v === null ? null : Math.max(0, v - (est[i] ?? 0)))) : all;
      const single = series.length === 1;
      const lastInStack = !s.stack || !series.slice(si + 1).some((o) => o.stack === s.stack);
      const top = !est && (inp.grouped ? lastInStack : single || si === series.length - 1);
      out.push({
        id: `s${si}`,
        name: est ? `${s.name} (reported as hours)` : s.name,
        type: 'bar',
        stack: inp.grouped ? s.stack : 'total',
        barMaxWidth: inp.grouped ? 14 : 24,
        barGap: inp.grouped ? '20%' : undefined,
        data: vals.map((v, i) => ({ value: v, itemStyle: { opacity: isProv(i) ? 0.4 : single ? 0.6 : 1 } })),
        itemStyle: { color: s.color, borderRadius: top ? [4, 4, 0, 0] : 0, borderColor: theme.card, borderWidth: (single || inp.grouped) && !s.stack ? 0 : 1 },
        emphasis: { disabled: true },
        z: 2,
      });
      legend.push({ label: est ? `${s.name} (reported as hours)` : s.name, color: s.color, kind: 'bar' });
      addColumn(s.name, all);
      if (est) {
        out.push({
          id: `s${si}-est`,
          name: ESTIMATED_LABEL,
          type: 'bar',
          stack: 'total',
          barMaxWidth: 24,
          data: est.map((v) => (v ? v : null)),
          itemStyle: { ...estimatedItemStyle(s.color, theme), borderRadius: [4, 4, 0, 0] },
          emphasis: { disabled: true },
          z: 2,
        });
        legend.push(estimatedLegend(s.color, theme));
        addColumn(`${s.name}: ${ESTIMATED_LABEL.toLowerCase()}`, est);
      }
    });
    for (const s of inp.tableOnly ?? []) addColumn(s.name, tx(aggregate(ctx.ds, s.metrics, buckets).values));
    const totals = tx(totalRaw);
    if (series.length > 1 && !inp.grouped) addColumn('Total', totals);
    const win = rollingWindow(g);
    if (win > 1 && !inp.grouped) {
      const name = g === 'week' ? '4-week average' : '3-month average';
      const color = series.length === 1 ? series[0].color : theme.ink2;
      const trend = rolling(totals, win);
      withProvisional('trend', series.length > 1 ? `${name} (all)` : name, trend, color, 4);
      legend.push({ label: series.length > 1 ? `${name} (all)` : name, color, kind: 'line' });
      addColumn(name, trend);
    }
    if (cmpRaw && ctx.cmp) {
      const cv = align(rate ? perActiveDay(cmpRaw.slice(0, ctx.cmp.buckets.length), ctx.cmp.buckets, activeDays) : cmpRaw, n);
      out.push({ id: 'ghost', name: ctx.cmp.label, type: 'line', data: cv, lineStyle: { color: theme.ghost, width: 2 }, itemStyle: { color: theme.ghost }, z: 3, ...smooth });
      legend.push({ label: ctx.cmp.label, color: theme.ghost, kind: 'ghost' });
      addColumn(ctx.cmp.label, cv);
    }
  }
  if (ctx.holidays.some(Boolean)) legend.push({ label: 'School break', color: theme.holiday, kind: 'holiday' });
  if (noReports.some((v, i) => v && !ctx.holidays[i])) legend.push({ label: 'No reports', color: theme.hatch, kind: 'hatch' });
  if (prov !== null) legend.push({ label: 'Still coming in', color: theme.ink3, kind: 'provisional' });

  const tooltip = {
    ...tooltipBase(theme),
    formatter: (raw: unknown) => {
      const params = asParams(raw);
      const i = params[0]?.dataIndex ?? 0;
      let html = tipTitle(buckets[i]?.title ?? '');
      const seen = new Set<string>();
      for (const p of params) {
        const id = String(p.seriesId ?? '');
        const base = id.replace(/-prov$/, '');
        const v = numericValue(p.value);
        if (id === 'band' || seen.has(base) || v === null) continue;
        seen.add(base);
        html += tipRow(String(p.color ?? theme.ink3), String(p.seriesName ?? ''), fmt(v));
      }
      if (!seen.size || noReports[i]) html += tipNote(ctx.holidays[i] ? 'School break: no reports' : 'No reports for this period', theme.ink3);
      else if (ctx.holidays[i]) html += tipNote('School break', theme.ink3);
      if (isProv(i)) html += tipNote('Reports may still be coming in', theme.ink3);
      return html;
    },
  };

  const totalSum = totalRaw.reduce<number>((a, v) => a + (v ?? 0), 0);
  const reported = totalRaw.filter((v) => v !== null).length;
  const periodWord = g === 'week' ? 'weeks' : g === 'month' ? 'months' : 'periods';
  const summary = `${inp.title}: ${fmtInt(totalSum)} ${unit} from ${fmtRange(ctx.from, ctx.to)}, with reports in ${reported} of ${n} ${periodWord}. The Table button lists every value.`;

  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 12, top: 14, bottom: 4 },
      tooltip,
      xAxis: timeXAxes(theme, buckets),
      yAxis: valueYAxes(theme, rate ? (v) => fmtOne(v) : fmtCompact),
      series: out,
    },
    table: { columns, rows },
    legend,
    summary,
    empty,
  };
}
