import { STREAMS } from '../../shared/metrics';
import { dayToIso, fmtDay, isoToDay } from '../../shared/dates';
import type { MetricId } from '../../shared/types';
import { streamsCovering } from '../lib/dataset';
import { esc, fmtInt } from '../lib/format';
import type { ViewContext } from '../lib/view';
import { baseOption, tooltipBase, type LegendItem } from './common';
import type { ChartResult } from './timeseries';

export type CalendarMode = 'streams' | { metrics: MetricId[]; unit: string };

/** GitHub-style year calendar: one cell per day, darker = more activity. */
export function buildCalendar(ctx: ViewContext, mode: CalendarMode): ChartResult {
  const { ds, theme } = ctx;
  const to = ctx.to;
  const from = Math.max(ctx.from, to - 370);
  const data: [string, number][] = [];
  const names = new Map<string, string[]>();
  let max = 0;
  for (let d = from; d <= to; d++) {
    const i = d - ds.origin;
    if (i < 0 || i >= ds.length) continue;
    if (mode === 'streams') {
      const s = streamsCovering(ds, d);
      if (!s.length) continue;
      data.push([dayToIso(d), s.length]);
      names.set(dayToIso(d), s);
      max = Math.max(max, s.length);
    } else {
      let v = 0;
      let covered = false;
      for (const m of mode.metrics) {
        v += ds.daily[m].values[i];
        if (ds.daily[m].covered[i]) covered = true;
      }
      if (!covered) continue;
      data.push([dayToIso(d), Math.round(v)]);
      max = Math.max(max, v);
    }
  }
  const r = theme.ramp;
  const pieces =
    mode === 'streams'
      ? [
          { min: 1, max: 1, color: r[2], label: '1 program' },
          { min: 2, max: 2, color: r[3], label: '2' },
          { min: 3, max: 3, color: r[4], label: '3' },
          { min: 4, max: 5, color: r[5], label: '4–5' },
          { min: 6, color: r[6], label: '6+' },
        ]
      : [0.2, 0.4, 0.6, 0.8, 1].map((q, k, arr) => {
          const lo = k === 0 ? 0 : Math.round(max * arr[k - 1]);
          const hi = Math.round(max * q);
          return { min: lo, max: hi, color: r[k + 2], label: `${fmtInt(lo)}–${fmtInt(hi)}` };
        });
  const legend: LegendItem[] = [{ label: 'No reports', color: r[0], kind: 'bar' }, ...pieces.map((p) => ({ label: p.label, color: p.color, kind: 'bar' as const }))];
  const unit = mode === 'streams' ? 'programs reporting' : mode.unit;

  return {
    option: {
      ...baseOption(),
      tooltip: {
        ...tooltipBase(theme, 'item'),
        formatter: (p: { value: [string, number] }) => {
          const [iso, v] = p.value;
          const list = names.get(iso);
          return `<div style="font-weight:700;margin-bottom:4px">${esc(fmtDay(isoToDay(iso)))}</div>${esc(fmtInt(v))} ${esc(unit)}${list ? `<div style="margin-top:4px;opacity:.8">${esc(list.join(', '))}</div>` : ''}`;
        },
      },
      visualMap: { type: 'piecewise', show: false, pieces: pieces.map(({ min, max: hi, color }) => ({ min, max: hi, color })) },
      calendar: {
        range: [dayToIso(from), dayToIso(to)],
        top: 24,
        left: 30,
        right: 6,
        bottom: 4,
        cellSize: ['auto', 15],
        splitLine: { show: false },
        itemStyle: { color: r[0], borderColor: theme.card, borderWidth: 2 },
        yearLabel: { show: false },
        monthLabel: { color: theme.ink3, fontSize: 11 },
        dayLabel: { firstDay: 1, nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], color: theme.ink3, fontSize: 10 },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data, itemStyle: { borderColor: theme.card, borderWidth: 2, borderRadius: 3 } }],
    },
    table: { columns: ['Day', unit], rows: data.map(([iso, v]) => [fmtDay(isoToDay(iso)), v]) },
    legend,
    summary: `Calendar of ${unit} per day from ${fmtDay(from)} to ${fmtDay(to)}; ${data.length} days with reports.`,
    empty: data.length === 0,
  };
}

export const STREAM_COUNT = STREAMS.length;
