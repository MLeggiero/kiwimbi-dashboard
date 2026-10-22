import { MANAGER_ONLY_METRICS, METRIC_BY_ID } from './metrics';
import { dayToIso, isoToDay, startOfMonth, startOfNextMonth, startOfWeek } from './dates';
import { presetRange, RANGE_PRESETS } from './ranges';
import type { Fact, ISODate, MentorCounts, Term } from './types';

// "How many mentors reported" is a distinct count, which can't be added up from smaller
// periods. Rather than send browsers a per-person id (which would let anyone rebuild each
// mentor's schedule), the server counts mentors for fixed periods only: every ISO week,
// month, term and preset range. Custom date ranges show no mentor count.

export const monthKey = (day: number) => dayToIso(startOfMonth(day)).slice(0, 7);
export const rangeKey = (from: number, to: number) => `${dayToIso(from)}|${dayToIso(to)}`;

export function countMentors(facts: Fact[], terms: Term[], today: ISODate): MentorCounts {
  const todayDay = isoToDay(today);
  // "All time" starts at the first report every viewer can see, so the preset keys match in every browser.
  const firstDay = facts.reduce((min, f) => (MANAGER_ONLY_METRICS.has(f.m) ? min : Math.min(min, isoToDay(f.s))), todayDay);
  const mentorFacts = facts.filter((f) => f.r && METRIC_BY_ID[f.m]?.program === 'mentorship').map((f) => ({ r: f.r!, s: isoToDay(f.s), e: isoToDay(f.e) }));
  const termDays = terms.map((t) => ({ label: t.label, start: isoToDay(t.start), end: isoToDay(t.end) }));

  const buckets = { week: new Map<string, Set<string>>(), month: new Map<string, Set<string>>(), term: new Map<string, Set<string>>(), range: new Map<string, Set<string>>() };
  const add = (map: Map<string, Set<string>>, key: string, id: string) => {
    const set = map.get(key);
    if (set) set.add(id);
    else map.set(key, new Set([id]));
  };

  for (const f of mentorFacts) {
    for (let w = startOfWeek(f.s); w <= f.e; w += 7) add(buckets.week, dayToIso(w), f.r);
    for (let m = startOfMonth(f.s); m <= f.e; m = startOfNextMonth(m)) add(buckets.month, monthKey(m), f.r);
    for (const t of termDays) if (f.e >= t.start && f.s <= t.end) add(buckets.term, t.label, f.r);
  }
  for (const p of RANGE_PRESETS) {
    const [from, to] = presetRange(p, todayDay, firstDay, termDays);
    const key = rangeKey(from, to);
    buckets.range.set(key, new Set());
    for (const f of mentorFacts) if (f.e >= from && f.s <= to) add(buckets.range, key, f.r);
  }

  const counts = (map: Map<string, Set<string>>) => Object.fromEntries([...map].map(([k, v]) => [k, v.size]));
  return { week: counts(buckets.week), month: counts(buckets.month), term: counts(buckets.term), range: counts(buckets.range) };
}
