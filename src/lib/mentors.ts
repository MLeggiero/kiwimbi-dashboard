import { dayToIso, startOfMonth, startOfNextMonth, startOfWeek } from '../../shared/dates';
import { monthKey, rangeKey } from '../../shared/mentors';
import type { Dataset } from './dataset';
import type { Bucket, Granularity } from './series';

// Mentor counts come pre-counted from the server for fixed periods (see shared/mentors.ts).
// These helpers look them up; they return null where no exact count exists.

/** Distinct mentors for a date range: preset ranges, whole ISO weeks, whole months or whole terms. */
export function mentorsInRange(ds: Dataset, from: number, to: number): number | null {
  const m = ds.payload.mentors;
  const key = rangeKey(from, to);
  if (key in m.range) return m.range[key];
  if (from === startOfWeek(from) && to === from + 6) return m.week[dayToIso(from)] ?? 0;
  if (from === startOfMonth(from) && to === startOfNextMonth(from) - 1) return m.month[monthKey(from)] ?? 0;
  const term = ds.terms.find((t) => t.start === from && t.end === to);
  return term ? (m.term[term.label] ?? 0) : null;
}

/** Distinct mentors for a chart period. Week buckets use the whole ISO week they belong to. */
export function mentorsInBucket(ds: Dataset, b: Bucket, g: Granularity): number | null {
  const m = ds.payload.mentors;
  if (g === 'week') return m.week[dayToIso(startOfWeek(b.start))] ?? 0;
  if (b.kind === 'term') return m.term[b.label] ?? 0;
  if (b.kind === 'break') return null;
  return m.month[monthKey(b.start)] ?? 0;
}

export function mentorsInWeek(ds: Dataset, weekStart: number): number {
  return ds.payload.mentors.week[dayToIso(startOfWeek(weekStart))] ?? 0;
}
