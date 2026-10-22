import type { EChartsCoreOption } from '../lib/echarts';
import { fmtInt, fmtPct } from '../lib/format';
import type { ChangeRow, ProgramRow, SchoolRow } from '../lib/manager';
import type { ChartTheme } from '../lib/theme.svelte';
import { baseOption, tooltipBase } from './common';

// Explanatory bar charts for the managers' dashboard: labels on the bars, no legends
// where the title and colors already say it.

export interface BarChart {
  option: EChartsCoreOption;
  height: number;
  summary: string;
  empty: boolean;
}

const categoryY = (theme: ChartTheme, labels: string[]) => ({
  type: 'category',
  data: labels,
  inverse: true,
  axisTick: { show: false },
  axisLine: { show: false },
  axisLabel: { color: theme.ink, fontSize: 12, fontWeight: 600, width: 150, overflow: 'truncate' },
});

/** Percent change on last year for each headline measure, centred on zero. */
export function buildChangeBars(rows: ChangeRow[], theme: ChartTheme): BarChart {
  const vals = rows.map((r) => (r.change === null ? null : Math.round(r.change * 1000) / 10));
  const max = Math.max(10, ...vals.map((v) => Math.abs(v ?? 0))) * 1.25;
  return {
    option: {
      ...baseOption(),
      grid: { left: 150, right: 60, top: 6, bottom: 6 },
      tooltip: { ...tooltipBase(theme, 'item'), formatter: (p: { dataIndex: number }) => `${rows[p.dataIndex].label}: ${vals[p.dataIndex] === null ? 'not enough reports last year to compare' : `${fmtPct(rows[p.dataIndex].change)} vs the same weeks last year`}` },
      xAxis: { type: 'value', min: -max, max, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
      yAxis: categoryY(theme, rows.map((r) => r.label)),
      series: [
        {
          type: 'bar',
          barWidth: 16,
          data: vals.map((v) => ({ value: v ?? 0, itemStyle: { color: v === null ? 'transparent' : v >= 0 ? theme.series[0] : theme.series[5], borderRadius: 3 } })),
          label: { show: true, position: 'right', color: theme.ink2, fontSize: 12, fontWeight: 700, formatter: (p: { dataIndex: number }) => (vals[p.dataIndex] === null ? 'n/a' : fmtPct(rows[p.dataIndex].change)) },
          markLine: { silent: true, symbol: 'none', lineStyle: { color: theme.axis, width: 1, type: 'solid' }, label: { show: false }, data: [{ xAxis: 0 }] },
          emphasis: { disabled: true },
        },
      ],
    },
    height: rows.length * 34 + 16,
    summary: rows.map((r) => `${r.label} ${r.change === null ? 'no comparison' : fmtPct(r.change)}`).join(', '),
    empty: false,
  };
}

/** Change by school on last year when there is enough to compare; otherwise meals per school day. */
export function buildSchoolBars(rows: SchoolRow[], colors: string[], theme: ChartTheme): BarChart & { mode: 'change' | 'rate' } {
  const changes = rows.filter((r) => r.change !== null).length >= 2;
  if (changes) {
    const vals = rows.map((r) => (r.change === null ? null : Math.round(r.change * 1000) / 10));
    const max = Math.max(10, ...vals.map((v) => Math.abs(v ?? 0))) * 1.25;
    return {
      mode: 'change',
      option: {
        ...baseOption(),
        grid: { left: 110, right: 150, top: 6, bottom: 6 },
        tooltip: { ...tooltipBase(theme, 'item'), formatter: (p: { dataIndex: number }) => `${rows[p.dataIndex].label}: ${fmtInt(rows[p.dataIndex].total)} meals, ${fmtInt(rows[p.dataIndex].perSchoolDay)} per school day` },
        xAxis: { type: 'value', min: -max, max, axisLabel: { show: false }, splitLine: { show: false } },
        yAxis: { ...categoryY(theme, rows.map((r) => r.label)), axisLabel: { color: theme.ink, fontSize: 12, fontWeight: 600 } },
        series: [
          {
            type: 'bar',
            barWidth: 18,
            data: vals.map((v, i) => ({ value: v ?? 0, itemStyle: { color: v === null ? 'transparent' : colors[i], borderRadius: 3 } })),
            label: { show: true, position: 'right', color: theme.ink2, fontSize: 12, fontWeight: 700, formatter: (p: { dataIndex: number }) => `${vals[p.dataIndex] === null ? 'n/a' : fmtPct(rows[p.dataIndex].change)}   ${fmtInt(rows[p.dataIndex].perSchoolDay)} a school day` },
            markLine: { silent: true, symbol: 'none', lineStyle: { color: theme.axis, width: 1, type: 'solid' }, label: { show: false }, data: [{ xAxis: 0 }] },
            emphasis: { disabled: true },
          },
        ],
      },
      height: rows.length * 40 + 16,
      summary: rows.map((r) => `${r.label} ${r.change === null ? 'no comparison' : fmtPct(r.change)}`).join(', '),
      empty: false,
    };
  }
  const vals = rows.map((r) => (r.perSchoolDay === null ? 0 : Math.round(r.perSchoolDay)));
  return {
    mode: 'rate',
    option: {
      ...baseOption(),
      grid: { left: 110, right: 70, top: 6, bottom: 6 },
      tooltip: { ...tooltipBase(theme, 'item'), formatter: (p: { dataIndex: number }) => `${rows[p.dataIndex].label}: ${fmtInt(rows[p.dataIndex].total)} meals` },
      xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { ...categoryY(theme, rows.map((r) => r.label)), axisLabel: { color: theme.ink, fontSize: 12, fontWeight: 600 } },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: vals.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 3 } })),
          label: { show: true, position: 'right', color: theme.ink2, fontSize: 12, fontWeight: 700, formatter: (p: { value: number }) => `${fmtInt(p.value)} a day` },
          emphasis: { disabled: true },
        },
      ],
    },
    height: rows.length * 40 + 16,
    summary: rows.map((r) => `${r.label} ${fmtInt(r.perSchoolDay)} meals per school day`).join(', '),
    empty: vals.every((v) => v === 0),
  };
}

/** Attendances by program, labelled with the typical weekly headcount. */
export function buildProgramBars(rows: ProgramRow[], colors: string[], theme: ChartTheme): BarChart {
  const shown = rows.filter((r) => r.total > 0);
  return {
    option: {
      ...baseOption(),
      grid: { left: 120, right: 170, top: 6, bottom: 6 },
      tooltip: { ...tooltipBase(theme, 'item'), formatter: (p: { dataIndex: number }) => `${shown[p.dataIndex].label}: ${fmtInt(shown[p.dataIndex].total)} attendances` },
      xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: categoryY(theme, shown.map((r) => r.label)),
      series: [
        {
          type: 'bar',
          barWidth: 16,
          data: shown.map((r, i) => ({ value: Math.round(r.total), itemStyle: { color: colors[i % colors.length], borderRadius: 3 } })),
          label: {
            show: true,
            position: 'right',
            color: theme.ink2,
            fontSize: 12,
            fontWeight: 700,
            formatter: (p: { dataIndex: number }) => {
              const r = shown[p.dataIndex];
              return `${fmtInt(r.total)}${r.typical ? `  ·  about ${fmtInt(r.typical)} a week` : ''}`;
            },
          },
          emphasis: { disabled: true },
        },
      ],
    },
    height: Math.max(80, shown.length * 30 + 16),
    summary: shown.map((r) => `${r.label} ${fmtInt(r.total)} attendances`).join(', '),
    empty: shown.length === 0,
  };
}

