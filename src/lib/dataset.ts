import { MANAGER_ONLY_METRICS, METRICS, METRIC_BY_ID, STREAMS, TEACHING_LEVELS, TEACHING_METRICS } from '../../shared/metrics';
import { isoToDay, startOfYear, weekdayIndex } from '../../shared/dates';
import type { ActiveDays, BookLocation, MetricId, PublicFact, PublicPayload, TeachingLevel } from '../../shared/types';

/**
 * A daily series is keyed by its metric id, or by a slice of one: books at one location,
 * contact hours at one school or level, the estimated part (old lesson counts) and the
 * part reported as hours. Every chart helper takes these keys like metric ids.
 */
export type SeriesKey = MetricId | `${MetricId}#${string}`;
export const baseMetric = (k: SeriesKey) => k.split('#')[0] as MetricId;
export const estKey = (m: MetricId): SeriesKey => `${m}#est`;
export const reportedKey = (m: MetricId): SeriesKey => `${m}#hours`;
export const locKey = (loc: BookLocation | 'unsplit'): SeriesKey => `books_checked_out#loc:${loc}`;
export const schoolKey = (m: MetricId, school: string): SeriesKey => `${m}#sch:${school}`;
export const levelKey = (m: MetricId, level: TeachingLevel): SeriesKey => `${m}#lvl:${level}`;
/** Books borrowed at the main library (or anywhere, before the split): the "books per visit" numerator. */
export const MAIN_BOOKS: SeriesKey[] = [locKey('main'), locKey('unsplit')];

function factKeys(f: PublicFact): SeriesKey[] {
  if (f.m === 'books_checked_out') return [locKey(f.loc ?? 'unsplit')];
  if (!TEACHING_METRICS.includes(f.m)) return [];
  if (f.est) return [estKey(f.m)];
  const keys: SeriesKey[] = [reportedKey(f.m)];
  if (f.sch) keys.push(schoolKey(f.m, f.sch));
  if (f.lvl) keys.push(levelKey(f.m, f.lvl));
  return keys;
}

/** Per-metric daily values after spreading each report across the days it covers. */
export interface DailySeries {
  values: Float64Array;
  /** 1 where at least one report covers the day (even if its value was 0). */
  covered: Uint8Array;
}

export interface Dataset {
  payload: PublicPayload;
  today: number;
  /** Day number of index 0 in every daily array. */
  origin: number;
  length: number;
  /** By metric id and by slice (see SeriesKey). A slice nobody reported has no entry. */
  daily: Partial<Record<SeriesKey, DailySeries>> & Record<MetricId, DailySeries>;
  facts: Record<MetricId, PublicFact[]>;
  /** Earliest day any report covers. */
  firstDay: number;
  lastActivity: Record<MetricId, number | null>;
  lastSubmitted: Record<MetricId, number | null>;
  /** Last day covered, by series key (including slices). */
  lastByKey: Partial<Record<SeriesKey, number>>;
  /** Schools with contact hours, in level order (Primary, Junior Secondary, Secondary) then by name. */
  schools: { label: string; site: string; level: TeachingLevel }[];
  /** Levels with contact hours, in that order. */
  levels: TeachingLevel[];
  terms: { label: string; start: number; end: number }[];
}

const isActive = (day: number, mode: ActiveDays) => mode === 'all' || weekdayIndex(day) < 5;

/**
 * Spread a report evenly over the active days it covers (school days for school
 * programs; every day otherwise). A report with no active days (a weekend-only
 * school report) is spread over all of its days instead. Totals are preserved.
 */
export function spreadFact(f: PublicFact, series: DailySeries, origin: number, mode: ActiveDays): void {
  const sd = isoToDay(f.s);
  const ed = isoToDay(f.e);
  let active = 0;
  for (let d = sd; d <= ed; d++) if (isActive(d, mode)) active++;
  const allDays = active === 0;
  const share = f.v / (allDays ? ed - sd + 1 : active);
  for (let d = sd; d <= ed; d++) {
    const i = d - origin;
    if (i < 0 || i >= series.values.length) continue;
    series.covered[i] = 1;
    if (allDays || isActive(d, mode)) series.values[i] += share;
  }
}

export function buildDataset(payload: PublicPayload): Dataset {
  const today = isoToDay(payload.today);
  let first = today;
  let last = today;
  for (const f of payload.facts) {
    // Manager-only metrics don't move "all time", so the server's preset mentor counts match for everyone.
    if (!MANAGER_ONLY_METRICS.has(f.m)) first = Math.min(first, isoToDay(f.s));
    last = Math.max(last, isoToDay(f.e));
  }
  // Leave a year of empty days before the first report so year-over-year comparisons
  // for the earliest year read as "no reports" rather than falling off the array.
  const origin = startOfYear(first) - 371;
  const length = last - origin + 8;

  const daily = {} as Dataset['daily'];
  const facts = {} as Record<MetricId, PublicFact[]>;
  const lastActivity = {} as Record<MetricId, number | null>;
  const lastSubmitted = {} as Record<MetricId, number | null>;
  const lastByKey: Dataset['lastByKey'] = {};
  const schools = new Map<string, { label: string; site: string; level: TeachingLevel }>();
  for (const m of METRICS) {
    daily[m.id] = { values: new Float64Array(length), covered: new Uint8Array(length) };
    facts[m.id] = [];
    lastActivity[m.id] = null;
    lastSubmitted[m.id] = null;
  }
  for (const f of payload.facts) {
    const def = METRIC_BY_ID[f.m];
    if (!def) continue;
    spreadFact(f, daily[f.m], origin, def.activeDays);
    for (const k of factKeys(f)) {
      const s = (daily[k] ??= { values: new Float64Array(length), covered: new Uint8Array(length) });
      spreadFact(f, s, origin, def.activeDays);
      lastByKey[k] = Math.max(lastByKey[k] ?? -Infinity, isoToDay(f.e));
    }
    if (f.sch && f.site && f.lvl) schools.set(f.sch, { label: f.sch, site: f.site, level: f.lvl });
    facts[f.m].push(f);
    lastActivity[f.m] = Math.max(lastActivity[f.m] ?? -Infinity, isoToDay(f.e));
    lastSubmitted[f.m] = Math.max(lastSubmitted[f.m] ?? -Infinity, isoToDay(f.t));
  }
  return {
    payload,
    today,
    origin,
    length,
    daily,
    facts,
    firstDay: first,
    lastActivity,
    lastSubmitted,
    lastByKey,
    schools: [...schools.values()].sort((a, b) => TEACHING_LEVELS.indexOf(a.level) - TEACHING_LEVELS.indexOf(b.level) || a.site.localeCompare(b.site)),
    levels: TEACHING_LEVELS.filter((l) => [...schools.values()].some((s) => s.level === l)),
    terms: payload.terms.map((t) => ({ label: t.label, start: isoToDay(t.start), end: isoToDay(t.end) })),
  };
}

/** Number of activity streams (meals, library, mentorship, each program) covering a day. */
export function streamsCovering(ds: Dataset, day: number): string[] {
  const i = day - ds.origin;
  if (i < 0 || i >= ds.length) return [];
  return STREAMS.filter((s) => s.metrics.some((m) => ds.daily[m].covered[i])).map((s) => s.label);
}

export function lastActivityOf(ds: Dataset, metrics: MetricId[]): number | null {
  let best: number | null = null;
  for (const m of metrics) {
    const v = ds.lastActivity[m];
    if (v !== null && (best === null || v > best)) best = v;
  }
  return best;
}
