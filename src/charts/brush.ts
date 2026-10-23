import { STREAMS } from '../../shared/metrics';
import { fmtDay, startOfWeek } from '../../shared/dates';
import type { Dataset } from '../lib/dataset';
import type { EChartsCoreOption } from '../lib/echarts';
import { rangeStats } from '../lib/series';
import type { ChartTheme } from '../lib/theme.svelte';

export const DAY_MS = 86_400_000;

/** A slim overview of all reporting activity with a draggable window for the date range. */
export function buildBrush(ds: Dataset, from: number, to: number, theme: ChartTheme): EChartsCoreOption {
  const start = startOfWeek(Math.min(ds.firstDay, from));
  const end = Math.max(ds.today, to);
  const data: [number, number][] = [];
  for (let w = start; w <= end; w += 7) {
    const active = STREAMS.filter((s) => rangeStats(ds, s.metrics, w, w + 6).coveredDays > 0).length;
    data.push([w * DAY_MS, active]);
  }
  const leaf = theme.series[0];
  return {
    animation: false,
    grid: { left: 12, right: 12, top: 0, height: 1 },
    xAxis: { type: 'time', show: false, min: start * DAY_MS, max: (end + 1) * DAY_MS },
    yAxis: { type: 'value', show: false, min: 0, max: STREAMS.length },
    series: [{ type: 'line', data, step: 'end', showSymbol: false, silent: true, lineStyle: { width: 0 } }],
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        startValue: from * DAY_MS,
        endValue: (to + 1) * DAY_MS - 1,
        top: 6,
        height: 34,
        left: 12,
        right: 12,
        brushSelect: false,
        showDetail: true,
        labelFormatter: (v: number) => fmtDay(Math.floor(v / DAY_MS)),
        textStyle: { color: theme.ink2, fontSize: 11 },
        borderColor: theme.axis,
        borderRadius: 8,
        backgroundColor: 'transparent',
        fillerColor: theme.dark ? 'rgba(160,206,78,0.18)' : 'rgba(160,206,78,0.22)',
        handleSize: '90%',
        handleStyle: { color: theme.card, borderColor: theme.ink3 },
        moveHandleSize: 5,
        moveHandleStyle: { color: theme.axis },
        dataBackground: { lineStyle: { color: theme.ink3, opacity: 0.5, width: 1 }, areaStyle: { color: theme.ink3, opacity: 0.1 } },
        selectedDataBackground: { lineStyle: { color: leaf, width: 1 }, areaStyle: { color: leaf, opacity: 0.25 } },
      },
    ],
  };
}
