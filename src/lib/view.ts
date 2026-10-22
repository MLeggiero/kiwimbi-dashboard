import { makeComparison, type CompareMode, type CompareSpec, type Comparison } from './compare';
import type { Dataset } from './dataset';
import { holidayFlags, makeBuckets, type Bucket, type Granularity } from './series';
import type { ViewMode } from './state.svelte';
import type { ChartTheme } from './theme.svelte';

/** Everything a chart needs to know about the current filter selection. */
export interface ViewContext {
  ds: Dataset;
  from: number;
  to: number;
  g: Granularity;
  view: ViewMode;
  compare: CompareMode;
  buckets: Bucket[];
  holidays: boolean[];
  /** First bucket that may still be missing late reports (ends within the last 14 days). */
  provisionalFrom: number | null;
  /** Periods A and B, when comparing. */
  comparison: Comparison | null;
  /** Period B drawn over the chart bucket by bucket: only when A is the chart's whole range. */
  cmp: { from: number; to: number; buckets: Bucket[]; label: string } | null;
  theme: ChartTheme;
}

export const REPORTING_LAG_DAYS = 14;

export function makeViewContext(ds: Dataset, from: number, to: number, g: Granularity, view: ViewMode, spec: CompareSpec, theme: ChartTheme): ViewContext {
  const buckets = makeBuckets(from, to, g, ds.terms);
  const comparison = makeComparison(spec, ds, [from, to], g);
  const overlay = comparison?.whole && (spec.mode === 'prev' || spec.mode === 'yoy') ? comparison.b : null;
  const lagStart = ds.today - (REPORTING_LAG_DAYS - 1);
  const provisionalFrom = buckets.findIndex((b) => b.end >= lagStart);
  return {
    ds,
    from,
    to,
    g,
    view,
    compare: spec.mode,
    buckets,
    holidays: holidayFlags(buckets, ds.terms),
    provisionalFrom: provisionalFrom >= 0 ? provisionalFrom : null,
    comparison,
    cmp: overlay ? { from: overlay.from, to: overlay.to, buckets: makeBuckets(overlay.from, overlay.to, g, ds.terms), label: spec.mode === 'yoy' ? 'Same period last year' : 'Previous period' } : null,
    theme,
  };
}
