import { ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID, TEACHING_METRICS } from '../../shared/metrics';
import { dayParts, fmtDay, fmtDayShort, fmtRange, startOfYear } from '../../shared/dates';
import type { MetricId } from '../../shared/types';
import { MAIN_BOOKS, type Dataset } from './dataset';
import type { Preset } from './presets';
import { rangeStats, typicalWeekly } from './series';
import { EST_CLASSROOM } from './teaching';

// The numbers behind the impact story. Pure functions of the dataset, so they can be
// tested. The story never shows report counts or data-check counts (those are for
// managers), and it sticks to the selected dates: no comparisons with earlier periods.

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLong = (m: number) => MONTHS_LONG[m - 1];

export interface StoryPeriod {
  preset: Preset;
  from: number;
  to: number;
  /** Heading form: "2026 so far", "The last 3 months", "2025", "Since July 27". */
  label: string;
  /** Sentence form: "so far this year", "in the last 3 months", "in 2025", "since July 27". */
  phrase: string;
}

/** Wording for any date range the timeline can select. */
export function storyPeriod(ds: Dataset, preset: Preset, from: number, to: number): StoryPeriod {
  const y = dayParts(to).y;
  const sinceDay = () => {
    const f = dayParts(from);
    return `${monthLong(f.m)} ${f.d}${f.y === y ? '' : `, ${f.y}`}`;
  };
  switch (preset) {
    case 'ytd':
      // While reports only start partway through the year, say exactly when they start.
      return { preset, from, to, label: `${y} so far`, phrase: from > startOfYear(to) ? `since ${sinceDay()}` : 'so far this year' };
    case 'lastyear':
      return { preset, from, to, label: String(y), phrase: `in ${y}` };
    case 'last1w':
      return { preset, from, to, label: 'The last week', phrase: 'in the last week' };
    case 'last1m':
      return { preset, from, to, label: 'The last month', phrase: 'in the last month' };
    case 'last3m':
      return { preset, from, to, label: 'The last 3 months', phrase: 'in the last 3 months' };
    case 'term': {
      const term = ds.terms.find((t) => t.start === from);
      return { preset, from, to, label: term ? term.label : 'This term', phrase: 'this term' };
    }
    case 'all':
      return { preset, from, to, label: `Since ${sinceDay()}`, phrase: `since ${sinceDay()}` };
    default:
      return { preset, from, to, label: fmtRange(from, to), phrase: `from ${fmtDayShort(from)} to ${fmtDay(to)}` };
  }
}

export interface Measure {
  /** Null when nothing was reported in the period. */
  total: number | null;
  /** Average over the weekdays that have reports, so school breaks don't drag it down. */
  perSchoolDay: number | null;
}

export function measure(ds: Dataset, metrics: MetricId[], p: StoryPeriod): Measure {
  const st = rangeStats(ds, metrics, p.from, p.to);
  if (!st.coveredDays) return { total: null, perSchoolDay: null };
  return { total: st.total, perSchoolDay: st.coveredWeekdays ? st.total / st.coveredWeekdays : null };
}

export interface Share {
  id: MetricId;
  label: string;
  value: number;
}

export function shares(ds: Dataset, metrics: MetricId[], p: StoryPeriod): Share[] {
  return metrics.map((id) => ({ id, label: METRIC_BY_ID[id].short, value: rangeStats(ds, [id], p.from, p.to).total }));
}

export interface ProgramStat {
  id: MetricId;
  /** Attendances in the period; null when nothing was reported. */
  total: number | null;
  /** Middle value of single-week reports: how many students take part in a typical week. */
  typical: number | null;
}

export interface Story {
  period: StoryPeriod;
  meals: Measure;
  schools: Share[];
  visits: Measure;
  books: Measure;
  /** Main-library books borrowed per library visit (visits are counted at the main library). */
  booksPerVisit: number | null;
  /** Contact hours: time teaching or mentoring students, classroom and mentorship. */
  hours: Measure;
  classroom: number;
  mentorship: number;
  /** Part of the classroom hours estimated from old lesson counts (40 minutes a lesson). */
  estimated: number;
  /** Contact hours in an average school week (five school days with reports). */
  hoursPerWeek: number | null;
  programs: ProgramStat[];
  workshops: number | null;
}

export function buildStory(ds: Dataset, preset: Preset, from: number, to: number): Story {
  const p = storyPeriod(ds, preset, from, to);
  const meals = measure(ds, MEAL_SCHOOLS, p);
  const visits = measure(ds, ['library_visits'], p);
  const books = measure(ds, ['books_checked_out'], p);
  const hours = measure(ds, TEACHING_METRICS, p);
  const hourStats = rangeStats(ds, TEACHING_METRICS, p.from, p.to);
  const mainBooks = rangeStats(ds, MAIN_BOOKS, p.from, p.to);
  const workshops = rangeStats(ds, ['agronomy_workshops'], p.from, p.to);
  return {
    period: p,
    meals,
    schools: shares(ds, MEAL_SCHOOLS, p),
    visits,
    books,
    booksPerVisit: visits.total && mainBooks.coveredDays ? mainBooks.total / visits.total : null,
    hours,
    classroom: rangeStats(ds, ['contact_classroom'], p.from, p.to).total,
    mentorship: rangeStats(ds, ['contact_mentorship'], p.from, p.to).total,
    estimated: rangeStats(ds, [EST_CLASSROOM], p.from, p.to).total,
    hoursPerWeek: hourStats.coveredWeekdays ? hourStats.total / (hourStats.coveredWeekdays / 5) : null,
    programs: ENRICHMENT.map((m) => {
      const st = rangeStats(ds, [m], p.from, p.to);
      return { id: m, total: st.coveredDays ? st.total : null, typical: typicalWeekly(ds, m, p.from, p.to) };
    }),
    workshops: workshops.coveredDays ? workshops.total : null,
  };
}
