import { fmtRange } from '../../shared/dates';
import { fmtInt, fmtOne } from '../lib/format';
import { mentorsInBucket } from '../lib/mentors';
import { aggregate } from '../lib/series';
import type { ViewContext } from '../lib/view';
import { asParams, bandSeries, baseOption, compareBandSeries, compareNotes, numericValue, timeXAxes, tipNote, tipRow, tipTitle, tooltipBase, valueYAxes, type LegendItem } from './common';
import type { ChartResult } from './timeseries';

/** Books checked out per library visit, per period. */
export function buildRatio(ctx: ViewContext): ChartResult {
  const { ds, buckets, theme } = ctx;
  const visits = aggregate(ds, ['library_visits'], buckets).values;
  const books = aggregate(ds, ['books_checked_out'], buckets).values;
  const ratio = buckets.map((_, i) => (visits[i] && books[i] !== null ? books[i]! / visits[i]! : null));
  const noReports = ratio.map((v) => v === null);
  const color = theme.series[2];
  const legend: LegendItem[] = [{ label: 'Books per visit', color, kind: 'line' }];
  if (ctx.holidays.some(Boolean)) legend.push({ label: 'School break', color: theme.holiday, kind: 'holiday' });
  const bands = compareBandSeries(ctx);
  legend.push(...bands.legend);
  const notes = (i: number) => compareNotes(ctx, buckets[i]).map((n) => tipNote(n, n.endsWith('A') ? theme.cmpA : theme.cmpB)).join('');
  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 12, top: bands.series ? 24 : 14, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        formatter: (raw: unknown) => {
          const i = asParams(raw)[0]?.dataIndex ?? 0;
          let html = tipTitle(buckets[i]?.title ?? '');
          if (ratio[i] === null) return html + tipNote('Needs both visits and books reported', theme.ink3) + notes(i);
          html += tipRow(color, 'Books per visit', fmtOne(ratio[i]));
          html += tipRow(theme.ink3, 'Visits', fmtInt(visits[i]));
          html += tipRow(theme.ink3, 'Books checked out', fmtInt(books[i]));
          return html + notes(i);
        },
      },
      xAxis: timeXAxes(theme, buckets),
      yAxis: valueYAxes(theme, (v) => fmtOne(v)),
      series: [
        bandSeries(buckets, ctx.holidays, noReports.map(() => false), theme),
        { id: 'ratio', name: 'Books per visit', type: 'line', data: ratio, connectNulls: false, smooth: 0.3, smoothMonotone: 'x', symbol: 'circle', symbolSize: 7, lineStyle: { color, width: 2 }, itemStyle: { color, borderColor: theme.card, borderWidth: 2 } },
        ...(bands.series ? [bands.series] : []),
      ],
    },
    table: { columns: ['Period', 'Visits', 'Books checked out', 'Books per visit'], rows: buckets.map((b, i) => [b.title, visits[i] === null ? null : Math.round(visits[i]!), books[i] === null ? null : Math.round(books[i]!), ratio[i] === null ? null : Math.round(ratio[i]! * 100) / 100]) },
    legend,
    summary: `Books checked out per library visit, ${fmtRange(ctx.from, ctx.to)}.`,
    empty: noReports.every(Boolean),
  };
}

/** Distinct mentors reporting classes in each period, pre-counted on the server (no names or ids). */
export function buildActiveMentors(ctx: ViewContext): ChartResult {
  const { ds, buckets, theme, g } = ctx;
  const counts = buckets.map((b) => mentorsInBucket(ds, b, g));
  const color = theme.series[0];
  const prov = ctx.provisionalFrom;
  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 12, top: 14, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        formatter: (raw: unknown) => {
          const p = asParams(raw).find((x) => x.seriesId === 'mentors');
          const i = p?.dataIndex ?? 0;
          const v = numericValue(p?.value);
          return (
            tipTitle(buckets[i]?.title ?? '') +
            (v === null ? tipNote('No count for a school break', theme.ink3) : tipRow(color, 'Mentors reporting', fmtInt(v))) +
            (g === 'week' && buckets[i]?.partial ? tipNote('Counted over the whole week', theme.ink3) : '') +
            (prov !== null && i >= prov ? tipNote('Reports may still be coming in', theme.ink3) : '')
          );
        },
      },
      xAxis: timeXAxes(theme, buckets),
      yAxis: valueYAxes(theme, (v) => fmtInt(v)),
      series: [
        bandSeries(buckets, ctx.holidays, buckets.map(() => false), theme),
        { id: 'mentors', name: 'Mentors reporting', type: 'bar', barMaxWidth: 20, itemStyle: { color, borderRadius: [4, 4, 0, 0] }, data: counts.map((v, i) => ({ value: v, itemStyle: { opacity: prov !== null && i >= prov ? 0.45 : 0.85 } })), emphasis: { disabled: true } },
      ],
    },
    table: { columns: ['Period', 'Mentors reporting'], rows: buckets.map((b, i) => [b.title, counts[i]]) },
    legend: [],
    summary: `Number of mentors reporting classes per period, ${fmtRange(ctx.from, ctx.to)}.`,
    empty: counts.every((c) => !c),
  };
}
