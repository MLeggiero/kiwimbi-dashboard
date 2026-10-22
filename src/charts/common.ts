import { fmtRange } from '../../shared/dates';
import type { Period } from '../lib/compare';
import { esc, fmtCompact } from '../lib/format';
import type { Bucket } from '../lib/series';
import type { ChartTheme } from '../lib/theme.svelte';
import type { ViewContext } from '../lib/view';

export interface LegendItem {
  label: string;
  color: string;
  kind: 'bar' | 'line' | 'area' | 'ghost' | 'target' | 'holiday' | 'hatch' | 'provisional' | 'span';
}

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const baseOption = () => ({
  animation: !reducedMotion(),
  animationDuration: 350,
  textStyle: { fontFamily: '"Open Sans", system-ui, -apple-system, "Segoe UI", sans-serif' },
});

/** Mixes two #rgb/#rrggbb colors (t = 0 gives a, 1 gives b). Other formats return a unchanged. */
export function mixHex(a: string, b: string, t: number): string {
  const rgb = (c: string) => {
    const h = c.trim().replace(/^#/, '');
    const full = h.length === 3 ? [...h].map((x) => x + x).join('') : h;
    return /^[0-9a-f]{6}$/i.test(full) ? [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) : null;
  };
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return a;
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** A seamless 45° hatch tile used to mark periods with no reports. */
export function hatchPattern(color: string) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const g = c.getContext('2d')!;
  g.strokeStyle = color;
  g.lineWidth = 1;
  for (const [x1, y1, x2, y2] of [
    [0, 8, 8, 0],
    [-2, 2, 2, -2],
    [6, 10, 10, 6],
  ]) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  return { image: c, repeat: 'repeat' as const };
}

/**
 * Category x-axis keyed by each bucket's start day, plus a hidden twin axis that carries
 * full-width background bands (school breaks, weeks with no reports).
 */
export function timeXAxes(theme: ChartTheme, buckets: Bucket[]) {
  const keys = buckets.map((b) => String(b.start));
  const labels = new Map(buckets.map((b) => [String(b.start), b.label]));
  return [
    {
      type: 'category',
      data: keys,
      boundaryGap: true,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.axis } },
      axisLabel: { color: theme.ink3, fontSize: 11, hideOverlap: true, formatter: (k: string) => labels.get(k) ?? '' },
    },
    { type: 'category', data: keys, boundaryGap: true, show: false },
    // Day-accurate positions for comparison bands: bucket i spans [i, i + 1].
    { type: 'value', min: 0, max: Math.max(1, buckets.length), show: false },
  ];
}

/** Where a day starts (or, with `end`, finishes) on the band axis, in bucket units. */
function dayPos(buckets: Bucket[], day: number, end = false): number {
  const i = buckets.findIndex((b) => day >= b.start && day <= b.end);
  if (i < 0) return day < (buckets[0]?.start ?? 0) ? 0 : buckets.length;
  const b = buckets[i];
  return i + (day - b.start + (end ? 1 : 0)) / (b.end - b.start + 1);
}

export interface CompareBand {
  key: 'A' | 'B';
  period: Period;
  color: string;
  /** Some of the period falls inside the chart's dates. */
  visible: boolean;
}

/** The comparison periods to mark on a chart: B always, A unless it is the whole chart. */
export function compareBands(ctx: ViewContext): CompareBand[] {
  const c = ctx.comparison;
  if (!c) return [];
  const out: CompareBand[] = [];
  const add = (key: 'A' | 'B', period: Period, color: string) => out.push({ key, period, color, visible: period.to >= ctx.from && period.from <= ctx.to });
  if (!c.whole) add('A', c.a, ctx.theme.cmpA);
  add('B', c.b, ctx.theme.cmpB);
  return out;
}

/**
 * Shaded, labelled bands over the stretches being compared, so a long chart shows exactly
 * which weeks A and B are. Also returns legend entries (bands off the chart say so).
 */
export function compareBandSeries(ctx: ViewContext): { series: Record<string, unknown> | null; legend: LegendItem[] } {
  const bands = compareBands(ctx);
  const legend: LegendItem[] = [];
  const areas: unknown[] = [];
  const edges: unknown[] = [];
  for (const b of bands) {
    // With the overlay line drawn, B being off the chart is already explained by the legend.
    if (!b.visible && ctx.cmp) continue;
    legend.push({ label: `${b.key}: ${fmtRange(b.period.from, b.period.to)}${b.visible ? '' : ' (outside the chart’s dates)'}`, color: b.color, kind: 'span' });
    if (!b.visible) continue;
    const x0 = dayPos(ctx.buckets, Math.max(b.period.from, ctx.from));
    const x1 = dayPos(ctx.buckets, Math.min(b.period.to, ctx.to), true);
    areas.push([
      { name: b.key, xAxis: x0, itemStyle: { color: b.color, opacity: ctx.theme.dark ? 0.16 : 0.11 }, label: { show: true, position: 'top', distance: 3, color: b.color, fontSize: 11, fontWeight: 800, formatter: b.key } },
      { xAxis: x1 },
    ]);
    for (const x of [x0, x1]) edges.push({ xAxis: x, lineStyle: { color: b.color, width: 1.25, type: [4, 3], opacity: 0.9 } });
  }
  if (!areas.length) return { series: null, legend };
  return {
    series: {
      id: 'compare',
      type: 'line',
      xAxisIndex: 2,
      yAxisIndex: 1,
      data: [],
      silent: true,
      z: 1,
      animation: false,
      tooltip: { show: false },
      markArea: { silent: true, data: areas },
      markLine: { silent: true, symbol: 'none', label: { show: false }, data: edges },
    },
    legend,
  };
}

/** Tooltip notes for a bucket that falls (partly) in period A or B. */
export function compareNotes(ctx: ViewContext, bucket: Bucket | undefined): string[] {
  if (!bucket) return [];
  return compareBands(ctx)
    .filter((b) => b.visible && b.period.to >= bucket.start && b.period.from <= bucket.end)
    .map((b) => `${b.period.from <= bucket.start && b.period.to >= bucket.end ? 'In' : 'Partly in'} period ${b.key}`);
}

export function valueYAxes(theme: ChartTheme, fmt: (v: number) => string = fmtCompact) {
  return [
    {
      type: 'value',
      splitNumber: 4,
      axisLabel: { color: theme.ink3, fontSize: 11, formatter: (v: number) => fmt(v) },
      splitLine: { lineStyle: { color: theme.grid, width: 1 } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    { type: 'value', min: 0, max: 1, show: false },
  ];
}

export function bandSeries(buckets: Bucket[], holidays: boolean[], noReports: boolean[], theme: ChartTheme) {
  const hatch = hatchPattern(theme.hatch);
  return {
    id: 'band',
    type: 'bar',
    xAxisIndex: 1,
    yAxisIndex: 1,
    barWidth: '100%',
    silent: true,
    z: 0,
    animation: false,
    tooltip: { show: false },
    emphasis: { disabled: true },
    data: buckets.map((_, i) =>
      holidays[i] ? { value: 1, itemStyle: { color: theme.holiday } } : noReports[i] ? { value: 1, itemStyle: { color: hatch } } : { value: 0, itemStyle: { color: 'transparent' } },
    ),
  };
}

export function tooltipBase(theme: ChartTheme, trigger: 'axis' | 'item' = 'axis') {
  return {
    trigger,
    confine: true,
    axisPointer: { type: 'line', lineStyle: { color: theme.axis, width: 1 } },
    backgroundColor: theme.card,
    borderColor: theme.axis,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: theme.ink, fontSize: 12 },
    extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);',
  };
}

export const tipTitle = (t: string) => `<div style="font-weight:700;margin-bottom:6px">${esc(t)}</div>`;

/** Tooltip row: value first (strong), series second, keyed by a short line in the series color. */
export const tipRow = (color: string, label: string, value: string) =>
  `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:190px;line-height:1.7">` +
  `<span style="display:flex;align-items:center;gap:6px;color:inherit;opacity:.85"><span style="display:inline-block;width:12px;height:2px;border-radius:1px;background:${color}"></span>${esc(label)}</span>` +
  `<strong>${esc(value)}</strong></div>`;

export const tipNote = (text: string, color: string) => `<div style="margin-top:6px;font-size:11px;color:${color}">${esc(text)}</div>`;

interface AxisParam {
  seriesId?: string;
  seriesName?: string;
  dataIndex: number;
  value?: unknown;
  color?: string;
}

export const asParams = (raw: unknown): AxisParam[] => (Array.isArray(raw) ? raw : [raw]) as AxisParam[];

export const numericValue = (v: unknown): number | null => {
  const x = v !== null && typeof v === 'object' && 'value' in (v as object) ? (v as { value: unknown }).value : v;
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
};
