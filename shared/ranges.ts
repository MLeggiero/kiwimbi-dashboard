import { dayParts, shiftMonths, startOfYear, ymdToDay } from './dates';

// Preset date ranges, computed identically on the server (to pre-count mentors) and in the
// browser (for the filter bar). Everything is in whole day numbers.

export type RangePreset = 'ytd' | 'term' | 'last1w' | 'last1m' | 'last3m' | 'lastyear' | 'all';

export const RANGE_PRESETS: RangePreset[] = ['ytd', 'term', 'last1w', 'last1m', 'last3m', 'lastyear', 'all'];

/**
 * A preset's dates. No range reaches back before the first report (with DATA_START set,
 * nothing earlier exists), so a range can come out empty (end before start) when all of
 * it is earlier: callers hide those.
 */
export function presetRange(p: RangePreset, today: number, firstDay: number, terms: { start: number; end: number }[]): [number, number] {
  const [from, to] = rawRange(p, today, firstDay, terms);
  return [Math.max(from, Math.min(firstDay, today)), to];
}

function rawRange(p: RangePreset, today: number, firstDay: number, terms: { start: number; end: number }[]): [number, number] {
  switch (p) {
    case 'last1w':
      return [today - 6, today];
    case 'last1m':
      return [shiftMonths(today, -1) + 1, today];
    case 'last3m':
      return [shiftMonths(today, -3) + 1, today];
    case 'lastyear': {
      const y = dayParts(today).y - 1;
      return [ymdToDay(y, 1, 1), ymdToDay(y, 12, 31)];
    }
    case 'all':
      return [Math.min(firstDay, today), today];
    case 'term': {
      const current = terms.find((x) => today >= x.start && today <= x.end) ?? [...terms].reverse().find((x) => x.start <= today);
      return current ? [current.start, Math.min(current.end, today)] : [today - 90, today];
    }
    default:
      return [startOfYear(today), today];
  }
}
