import { esc, fmtCompact } from '../lib/format';
import type { Bucket } from '../lib/series';
import type { ChartTheme } from '../lib/theme.svelte';

export interface LegendItem {
  label: string;
  color: string;
  kind: 'bar' | 'line' | 'area' | 'ghost' | 'target' | 'holiday' | 'hatch' | 'provisional' | 'estimated';
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

/** Label for values estimated from old lesson counts, used in every legend. */
export const ESTIMATED_LABEL = 'Estimated from lesson counts';

/** The one style for estimated values: a lighter fill of the series color with a dashed edge. */
export const estimatedColor = (color: string, theme: ChartTheme) => mixHex(color, theme.card, theme.dark ? 0.5 : 0.55);
export const estimatedItemStyle = (color: string, theme: ChartTheme) => ({ color: estimatedColor(color, theme), borderColor: color, borderWidth: 1, borderType: [3, 2] });
export const estimatedLegend = (color: string, theme: ChartTheme): LegendItem => ({ label: ESTIMATED_LABEL, color: estimatedColor(color, theme), kind: 'estimated' });

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
  ];
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
