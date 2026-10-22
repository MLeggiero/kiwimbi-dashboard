import { fmtRange } from '../../shared/dates';
import { fmtCompact, fmtInt } from '../lib/format';
import { aggregate } from '../lib/series';
import type { ViewContext } from '../lib/view';
import { asParams, bandSeries, baseOption, compareBandSeries, compareNotes, numericValue, timeXAxes, tipNote, tipRow, tipTitle, tooltipBase, valueYAxes, type LegendItem } from './common';
import type { ChartResult } from './timeseries';

/** Primary classes above the line, secondary below: the balance between levels over time. */
export function buildButterfly(ctx: ViewContext): ChartResult {
  const { ds, buckets, theme } = ctx;
  const primary = aggregate(ds, ['classes_primary'], buckets).values;
  const secondary = aggregate(ds, ['classes_secondary'], buckets).values;
  const noReports = primary.map((v, i) => v === null && secondary[i] === null);
  const prov = ctx.provisionalFrom;
  const op = (i: number) => (prov !== null && i >= prov ? 0.45 : 1);
  const legend: LegendItem[] = [
    { label: 'Primary classes', color: theme.series[0], kind: 'bar' },
    { label: 'Secondary classes', color: theme.series[1], kind: 'bar' },
  ];
  if (ctx.holidays.some(Boolean)) legend.push({ label: 'School break', color: theme.holiday, kind: 'holiday' });
  if (noReports.some((v, i) => v && !ctx.holidays[i])) legend.push({ label: 'No reports', color: theme.hatch, kind: 'hatch' });
  const bands = compareBandSeries(ctx);
  legend.push(...bands.legend);
  const [yMain, yBand] = valueYAxes(theme, (v) => fmtCompact(Math.abs(v)));

  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 12, top: bands.series ? 24 : 14, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        formatter: (raw: unknown) => {
          const params = asParams(raw);
          const i = params[0]?.dataIndex ?? 0;
          let html = tipTitle(buckets[i]?.title ?? '');
          for (const p of params) {
            const v = numericValue(p.value);
            if (p.seriesId === 'band' || p.seriesId === 'compare' || v === null) continue;
            html += tipRow(String(p.color), String(p.seriesName), fmtInt(Math.abs(v)));
          }
          if (noReports[i]) html += tipNote(ctx.holidays[i] ? 'School break: no reports' : 'No reports for this period', theme.ink3);
          for (const note of compareNotes(ctx, buckets[i])) html += tipNote(note, note.endsWith('A') ? theme.cmpA : theme.cmpB);
          return html;
        },
      },
      xAxis: timeXAxes(theme, buckets),
      yAxis: [yMain, yBand],
      series: [
        bandSeries(buckets, ctx.holidays, noReports, theme),
        { id: 'p', name: 'Primary classes', type: 'bar', stack: 'levels', barMaxWidth: 20, itemStyle: { color: theme.series[0], borderRadius: [4, 4, 0, 0] }, data: primary.map((v, i) => ({ value: v, itemStyle: { opacity: op(i) } })), emphasis: { disabled: true } },
        { id: 'q', name: 'Secondary classes', type: 'bar', stack: 'levels', barMaxWidth: 20, itemStyle: { color: theme.series[1], borderRadius: [0, 0, 4, 4] }, data: secondary.map((v, i) => ({ value: v === null ? null : -v, itemStyle: { opacity: op(i) } })), emphasis: { disabled: true } },
        ...(bands.series ? [bands.series] : []),
      ],
    },
    table: { columns: ['Period', 'Primary classes', 'Secondary classes'], rows: buckets.map((b, i) => [b.title, primary[i] === null ? null : Math.round(primary[i]!), secondary[i] === null ? null : Math.round(secondary[i]!)]) },
    legend,
    summary: `Primary and secondary mentorship classes per period, ${fmtRange(ctx.from, ctx.to)}.`,
    empty: noReports.every(Boolean),
  };
}
