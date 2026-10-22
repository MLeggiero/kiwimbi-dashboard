import { TEACHING_METRICS } from '../../shared/metrics';
import { baseMetric, estKey, type Dataset, type SeriesKey } from './dataset';
import { rangeStats } from './series';

// Teaching moved from lesson counts to contact hours. Old lesson counts are shown as
// estimated classroom hours (40 minutes a lesson); there is no mentorship history. These
// helpers keep comparisons across the switch like for like.

/** How a change was worked out: on everything, on classroom hours only, or not at all (a new measure). */
export type Basis = 'all' | 'classroom' | 'new';

export const EST_CLASSROOM = estKey('contact_classroom');

/** Some of these dates have contact hours estimated from lesson counts. */
export const hasEstimated = (ds: Dataset, from: number, to: number) => rangeStats(ds, [EST_CLASSROOM], from, to).coveredDays > 0;

const isTeaching = (k: SeriesKey) => TEACHING_METRICS.includes(baseMetric(k));

/**
 * The keys to compare two periods on. When either period has estimated weeks, contact hours
 * compare classroom hours only; a measure with no estimated counterpart (mentorship hours,
 * one school or one level) is a new measure, with no change shown.
 */
export function likeForLike(ds: Dataset, keys: readonly SeriesKey[], a: [number, number], b: [number, number]): { keys: SeriesKey[]; basis: Basis } {
  if (!keys.some(isTeaching) || (!hasEstimated(ds, a[0], a[1]) && !hasEstimated(ds, b[0], b[1]))) return { keys: [...keys], basis: 'all' };
  if (!keys.includes('contact_classroom')) return { keys: [...keys], basis: 'new' };
  const kept = keys.filter((k) => !isTeaching(k) || k === 'contact_classroom');
  return { keys: kept, basis: kept.length === keys.length ? 'all' : 'classroom' };
}

export function basisNote(b: Basis): string {
  if (b === 'classroom') return 'Classroom hours only: these dates include weeks estimated from lesson counts, which have no mentorship hours.';
  if (b === 'new') return 'New measure: the weeks estimated from lesson counts have nothing to compare it with.';
  return '';
}
