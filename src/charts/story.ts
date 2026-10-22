import { dayParts, fmtDayShort, monthName } from '../../shared/dates';
import type { SeriesKey } from '../lib/dataset';
import type { Dataset } from '../lib/dataset';
import type { EChartsCoreOption } from '../lib/echarts';
import { fmtCompact, fmtInt } from '../lib/format';
import { aggregate, autoGranularity, holidayFlags, makeBuckets, type Bucket } from '../lib/series';
import type { StoryPeriod } from '../lib/story';
import type { ChartTheme } from '../lib/theme.svelte';
import { REPORTING_LAG_DAYS } from '../lib/view';
import { asParams, bandSeries, baseOption, mixHex, numericValue, tipNote, tipRow, tipTitle, tooltipBase } from './common';

// Charts for the impact story: few marks, no legends or controls, labels written on the
// chart itself. The managers' view keeps the full-featured charts (timeseries.ts).

export interface StoryChart {
  option: EChartsCoreOption;
  /** Screen-reader description. */
  summary: string;
  empty: boolean;
}

/** Month names under the first bucket of each month (every third month over long ranges). */
function monthLabels(buckets: Bucket[], monthly: boolean): string[] {
  let prev = -1;
  const labels = buckets.map((b) => {
    const { y, m } = dayParts(b.start);
    const key = y * 12 + m;
    if (key === prev) return '';
    prev = key;
    if (!monthly) return monthName(m);
    if (m === 1) return `${monthName(m)} ${y}`;
    return (m - 1) % 3 === 0 ? monthName(m) : '';
  });
  // When only the last week of the first month is in range, its name would crowd the next one.
  if (!monthly && buckets.length > 6 && labels[0] && labels[1]) labels[0] = '';
  return labels;
}

const categoryAxis = (theme: ChartTheme, buckets: Bucket[], labels: string[]) => [
  {
    type: 'category',
    data: buckets.map((b) => String(b.start)),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: theme.axis } },
    axisLabel: { color: theme.ink3, fontSize: 12, interval: 0, hideOverlap: true, formatter: (_: string, i: number) => labels[i] ?? '' },
  },
  { type: 'category', data: buckets.map((b) => String(b.start)), show: false },
];

const quietValueAxis = (theme: ChartTheme) => [
  {
    type: 'value',
    splitNumber: 3,
    axisLabel: { color: theme.ink3, fontSize: 11, formatter: (v: number) => fmtCompact(v) },
    splitLine: { lineStyle: { color: theme.grid } },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  { type: 'value', min: 0, max: 1, show: false },
];

export interface ColumnsInput {
  ds: Dataset;
  period: StoryPeriod;
  theme: ChartTheme;
  series: { name: string; color: string; metrics: SeriesKey[] }[];
  /** Plural noun for tooltips and the average label: "lunches". */
  unit: string;
  /** Write the average week (or month) on the chart. Small charts leave it out. */
  average?: boolean;
}

/**
 * Columns per week (per month over long periods), stacked when there are several series,
 * with the average written on the chart. Weeks without reports are simply left empty.
 * Hovering a week darkens its bars and shows the figures for that week.
 */
export function buildColumns({ ds, period, theme, series, unit, average = true }: ColumnsInput): StoryChart {
  const g = autoGranularity(period.from, period.to);
  const buckets = makeBuckets(period.from, period.to, g, ds.terms);
  const labels = monthLabels(buckets, g !== 'week');
  const perSeries = series.map((s) => aggregate(ds, s.metrics, buckets).values);
  const totals = buckets.map((_, i) => (perSeries.some((v) => v[i] !== null) ? perSeries.reduce((a, v) => a + (v[i] ?? 0), 0) : null));
  const lagStart = ds.today - (REPORTING_LAG_DAYS - 1);
  const provisional = buckets.map((b) => b.end >= lagStart);
  const holidays = holidayFlags(buckets, ds.terms);
  // The average leaves out empty periods, the part-periods at either end and the still-filling recent ones.
  const settled = totals.filter((v, i): v is number => v !== null && !provisional[i] && !buckets[i].partial);
  const avg = settled.length ? settled.reduce((a, b) => a + b, 0) / settled.length : null;
  const word = g === 'week' ? 'week' : 'month';

  const out: Record<string, unknown>[] = [bandSeries(buckets, holidays, buckets.map(() => false), theme)];
  series.forEach((s, si) => {
    out.push({
      id: `s${si}`,
      name: s.name,
      type: 'bar',
      stack: 'total',
      barCategoryGap: '30%',
      barMaxWidth: 22,
      data: perSeries[si].map((v, i) => ({ value: v, itemStyle: { opacity: provisional[i] ? 0.45 : 1 } })),
      itemStyle: { color: s.color, borderRadius: si === series.length - 1 ? [2, 2, 0, 0] : 0 },
      emphasis: { itemStyle: { color: mixHex(s.color, theme.ink, 0.3) } },
      z: 2,
      ...(si === series.length - 1 && average && avg
        ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: theme.ink2, type: [4, 4], width: 1 },
              label: { position: 'insideStartTop', color: theme.ink, fontSize: 12, fontWeight: 600, backgroundColor: theme.card, padding: [2, 6], borderRadius: 2, formatter: `Average ${word}: ${fmtInt(avg)}` },
              data: [{ yAxis: avg }],
            },
          }
        : {}),
    });
  });

  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 8, top: average && avg ? 24 : 10, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        axisPointer: { type: 'shadow', shadowStyle: { color: theme.holiday } },
        formatter: (raw: unknown) => {
          const params = asParams(raw);
          const i = params[0]?.dataIndex ?? 0;
          const b = buckets[i];
          let html = tipTitle(b ? (g === 'week' ? `Week of ${fmtDayShort(b.start)}` : b.title) : '');
          if (totals[i] === null) return html + tipNote(holidays[i] ? 'School break' : `No ${unit} reported`, theme.ink3);
          if (series.length > 1) {
            for (const p of params) {
              const v = numericValue(p.value);
              if (p.seriesId !== 'band' && v !== null) html += tipRow(String(p.color), String(p.seriesName), fmtInt(v));
            }
          }
          html += tipRow(theme.ink, series.length > 1 ? 'Total' : unit[0].toUpperCase() + unit.slice(1), fmtInt(totals[i]));
          if (provisional[i]) html += tipNote('Reports may still be coming in', theme.ink3);
          return html;
        },
      },
      xAxis: categoryAxis(theme, buckets, labels),
      yAxis: quietValueAxis(theme),
      series: out,
    },
    summary: `${unit[0].toUpperCase()}${unit.slice(1)} per ${word}, ${period.phrase}${avg ? `; an average ${word} had about ${fmtInt(avg)}` : ''}.`,
    empty: totals.every((v) => v === null),
  };
}

export interface RaceInput {
  ds: Dataset;
  period: StoryPeriod;
  theme: ChartTheme;
  metrics: SeriesKey[];
  color: string;
  unit: string;
}

/**
 * Running total through the selected dates, week by week, with the latest total written at
 * the end of the line. Ranges shorter than 8 weeks or longer than a year get no chart.
 */
export function buildRace({ ds, period, theme, metrics, color, unit }: RaceInput): StoryChart | null {
  const { from, to } = period;
  if (to - from < 55 || to - from > 400) return null;
  const buckets = makeBuckets(from, to, 'week', []);
  const labels = monthLabels(buckets, false);
  const running: number[] = [];
  let run = 0;
  let d = from;
  for (const b of buckets) {
    for (; d <= b.end; d++) {
      const i = d - ds.origin;
      if (i < 0 || i >= ds.length) continue;
      for (const m of metrics) run += ds.daily[m]?.values[i] ?? 0;
    }
    running.push(run);
  }
  if (!running.length || run <= 0) return null;
  const last = running.length - 1;
  const label = { fontSize: 13, fontWeight: 700 };

  return {
    option: {
      ...baseOption(),
      grid: { left: 4, right: 16, top: 36, bottom: 4 },
      tooltip: {
        ...tooltipBase(theme),
        formatter: (raw: unknown) => {
          const i = asParams(raw)[0]?.dataIndex ?? 0;
          const b = buckets[i];
          return tipTitle(b ? `By ${fmtDayShort(b.end)}` : '') + tipRow(color, 'Running total', fmtInt(running[i]));
        },
      },
      xAxis: categoryAxis(theme, buckets, labels),
      yAxis: quietValueAxis(theme),
      series: [
        {
          id: 'cur',
          name: 'Running total',
          type: 'line',
          data: running,
          showSymbol: false,
          smooth: 0.2,
          lineStyle: { color, width: 3 },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.08 },
          markPoint: {
            silent: true,
            symbol: 'circle',
            symbolSize: 9,
            itemStyle: { color, borderColor: theme.card, borderWidth: 2 },
            label: { show: true, position: 'top', distance: 8, color, backgroundColor: theme.card, padding: [2, 6], borderRadius: 2, formatter: fmtInt(running[last]), ...label },
            data: [{ coord: [String(buckets[last].start), running[last]] }],
          },
          z: 3,
        },
      ],
    },
    summary: `Running total of ${unit}, ${period.phrase}: ${fmtInt(running[last])}.`,
    empty: false,
  };
}
