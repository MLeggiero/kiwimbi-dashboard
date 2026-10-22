import { startOfYear } from '../../shared/dates';
import { presetRange as sharedPresetRange, RANGE_PRESETS, type RangePreset } from '../../shared/ranges';
import type { Dataset } from './dataset';

export type Preset = RangePreset | 'custom';

export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'last1w', label: 'Last week' },
  { id: 'last1m', label: 'Last month' },
  { id: 'last3m', label: 'Last 3 months' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'term', label: 'This term' },
  { id: 'lastyear', label: 'Last year' },
  { id: 'all', label: 'All reports' },
  { id: 'custom', label: 'Custom dates' },
];

export function presetRange(p: RangePreset, ds: Dataset): [number, number] {
  return sharedPresetRange(p, ds.today, ds.firstDay, ds.terms);
}

/**
 * The presets worth offering: every one with some days after the first report, except
 * "all" when it is the same as "Year to date" (as it is while reporting began this year).
 * "Last year" is empty when the reports all start this year, so it isn't offered then.
 */
export function availablePresets(ds: Dataset): RangePreset[] {
  const [ytdFrom, ytdTo] = presetRange('ytd', ds);
  return RANGE_PRESETS.filter((p) => {
    if (p === 'term' && !ds.terms.length) return false;
    const [from, to] = presetRange(p, ds);
    if (to < from) return false;
    return p !== 'all' || from !== ytdFrom || to !== ytdTo;
  });
}

/**
 * The story offers "YTD" only once reports reach back to January 1. Until then it would
 * read as a whole year while covering part of one, so it's greyed out there and the range
 * since the first report takes its place.
 */
export function storyOffersYtd(ds: Dataset): boolean {
  return ds.firstDay <= startOfYear(ds.today);
}

/** The story's quick ranges: as above, plus "since the first report" while YTD is greyed out. */
export function storyPresets(ds: Dataset): RangePreset[] {
  const offered = availablePresets(ds);
  return storyOffersYtd(ds) || offered.includes('all') ? offered : [...offered, 'all'];
}
