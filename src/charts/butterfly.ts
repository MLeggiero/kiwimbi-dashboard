import { fmtRange } from '../../shared/dates';
import { TEACHING_METRICS } from '../../shared/metrics';
import type { MetricId, TeachingLevel } from '../../shared/types';
import { levelKey, schoolKey, type SeriesKey } from '../lib/dataset';
import { fmtCompact, fmtInt, fmtOne } from '../lib/format';
import { aggregate, cumulative, perActiveDay } from '../lib/series';
import { EST_CLASSROOM } from '../lib/teaching';
import type { ViewContext } from '../lib/view';
import { asParams, bandSeries, baseOption, ESTIMATED_LABEL, estimatedItemStyle, estimatedLegend, numericValue, timeXAxes, tipNote, tipRow, tipTitle, tooltipBase, valueYAxes, type LegendItem } from './common';
import type { ChartResult } from './timeseries';

export type TeachingSplit = 'level' | 'school';

type Vals = (number | null)[];

/**
 * Teaching contact hours per period: classroom hours above the line and mentorship hours below, each
 * stacked by level or by school. Hours estimated from old lesson counts (no school or level)
 * sit above the line in the estimated style. Follows Show: totals, running total or per school day.
 */
export function buildTeachingChart(ctx: ViewContext, by: TeachingSplit): ChartResult {
  const { ds, buckets, theme, view } = ctx;
  const levelColor: Record<TeachingLevel, string> = { Primary: theme.series[0], 'Junior Secondary': theme.series[4], Secondary: theme.series[1] };
  const palette = [theme.series[0], theme.series[2], theme.series[3], theme.series[4], theme.series[1], theme.series[5], theme.ink3];
  const groups: { label: string; key: (m: MetricId) => SeriesKey; color: string }[] =
    by === 'level'
      ? ds.levels.map((l) => ({ label: l, key: (m) => levelKey(m, l), color: levelColor[l] }))
      : ds.schools.map((s, i) => ({ label: s.label, key: (m) => schoolKey(m, s.label), color: palette[i % palette.length] }));

  const tx = (vals: Vals): Vals => (view === 'rate' ? perActiveDay(vals, buckets, 'weekdays') : view === 'cumulative' ? cumulative(vals) : vals);
  const fmt = view === 'rate' ? fmtOne : fmtInt;
  const all = aggregate(ds, TEACHING_METRICS, buckets).values;
  const noReports = all.map((v) => v === null);
  const est = tx(aggregate(ds, [EST_CLASSROOM], buckets).values);
  const hasEst = est.some((v) => v !== null && v > 0);
  const prov = ctx.provisionalFrom;
  const op = (i: number) => (prov !== null && i >= prov ? 0.45 : 1);

  const data = groups.map((g) => ({ ...g, up: tx(aggregate(ds, [g.key('contact_classroom')], buckets).values), down: tx(aggregate(ds, [g.key('contact_mentorship')], buckets).values) }));
  const bar = (id: string, name: string, stack: string, vals: Vals, itemStyle: Record<string, unknown>, sign = 1) => ({
    id,
    name,
    type: 'bar',
    stack,
    barMaxWidth: 20,
    itemStyle: { borderColor: theme.card, borderWidth: 1, ...itemStyle },
    data: vals.map((v, i) => ({ value: v === null || v === 0 ? null : sign * v, itemStyle: { opacity: op(i) } })),
    emphasis: { disabled: true },
  });
  const series: Record<string, unknown>[] = [bandSeries(buckets, ctx.holidays, noReports, theme)];
  for (const [gi, g] of data.entries()) series.push(bar(`up${gi}`, `Classroom · ${g.label}`, 'up', g.up, { color: g.color }));
  if (hasEst) series.push(bar('est', `Classroom · ${ESTIMATED_LABEL.toLowerCase()}`, 'up', est, estimatedItemStyle(theme.series[0], theme)));
  for (const [gi, g] of data.entries()) series.push(bar(`down${gi}`, `Mentorship · ${g.label}`, 'down', g.down, { color: g.color }, -1));

  const legend: LegendItem[] = data.map((g) => ({ label: g.label, color: g.color, kind: 'bar' }));
  if (hasEst) legend.push(estimatedLegend(theme.series[0], theme));
  if (ctx.holidays.some(Boolean)) legend.push({ label: 'School break', color: theme.holiday, kind: 'holiday' });
  if (noReports.some((v, i) => v && !ctx.holidays[i])) legend.push({ label: 'No reports', color: theme.hatch, kind: 'hatch' });
  if (prov !== null) legend.push({ label: 'Still coming in', color: theme.ink3, kind: 'provisional' });
  const [yMain, yBand] = valueYAxes(theme, (v) => (view === 'rate' ? fmtOne(Math.abs(v)) : fmtCompact(Math.abs(v))));

  // Table and CSV: one row per period, school and activity, with estimated hours marked.
  const raw = ds.schools.map((s) => ({ s, hours: TEACHING_METRICS.map((m) => aggregate(ds, [schoolKey(m, s.label)], buckets).values) }));
  const estRaw = aggregate(ds, [EST_CLASSROOM], buckets).values;
  const rows: (string | number | null)[][] = [];
  buckets.forEach((b, i) => {
    for (const { s, hours } of raw)
      TEACHING_METRICS.forEach((m, mi) => {
        const v = hours[mi][i];
        if (v !== null) rows.push([b.title, s.label, s.level, m === 'contact_classroom' ? 'Classroom' : 'Mentorship', Math.round(v * 10) / 10, 'No']);
      });
    if (estRaw[i]) rows.push([b.title, 'Not recorded', 'Not recorded', 'Classroom', Math.round(estRaw[i]! * 10) / 10, 'Yes']);
  });

  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 12, top: 14, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        formatter: (rawParams: unknown) => {
          const params = asParams(rawParams);
          const i = params[0]?.dataIndex ?? 0;
          let html = tipTitle(buckets[i]?.title ?? '');
          for (const p of params) {
            const v = numericValue(p.value);
            if (p.seriesId === 'band' || v === null) continue;
            html += tipRow(String(p.color), String(p.seriesName), fmt(Math.abs(v)));
          }
          if (noReports[i]) html += tipNote(ctx.holidays[i] ? 'School break: no reports' : 'No reports for this period', theme.ink3);
          if (prov !== null && i >= prov) html += tipNote('Reports may still be coming in', theme.ink3);
          return html;
        },
      },
      xAxis: timeXAxes(theme, buckets),
      yAxis: [yMain, yBand],
      series,
    },
    table: { columns: ['Period', 'School', 'Level', 'Activity', 'Teaching contact hours', 'Estimated from lesson counts'], rows },
    legend,
    summary: `Teaching contact hours per period, ${fmtRange(ctx.from, ctx.to)}: classroom hours above the line and mentorship hours below, by ${by}.`,
    empty: noReports.every(Boolean),
  };
}
