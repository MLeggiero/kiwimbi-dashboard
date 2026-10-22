import type { BookLocation, MetricDef, MetricId, ProgramId, TeachingLevel } from './types';

/** The dashboard's metric catalog. Schema only: labels and behavior, never values. */
export const METRICS: MetricDef[] = [
  { id: 'meals_amagoro', label: 'Meals at Amagoro', short: 'Amagoro', program: 'meals', site: 'Amagoro', unit: 'meals', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'meals_kidek', label: 'Meals at Kidek', short: 'Kidek', program: 'meals', site: 'Kidek', unit: 'meals', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'meals_ikapolok', label: 'Meals at Ikapolok', short: 'Ikapolok', program: 'meals', site: 'Ikapolok', unit: 'meals', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'meals_staff_tailoring', label: 'Meals for staff & tailoring', short: 'Staff & Tailoring', program: 'meals', site: 'Staff & Tailoring', unit: 'meals', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'library_visits', label: 'Library visits', short: 'Visits', program: 'library', unit: 'visits', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'books_checked_out', label: 'Books checked out', short: 'Books', program: 'library', unit: 'books', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'library_lessons', label: 'Library lessons', short: 'Lessons', program: 'library', unit: 'lessons', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'contact_classroom', label: 'Classroom contact hours', short: 'Classroom', program: 'mentorship', unit: 'hours', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'contact_mentorship', label: 'Mentorship contact hours', short: 'Mentorship', program: 'mentorship', unit: 'hours', activeDays: 'weekdays', kind: 'flow', defaultSpanDays: 5, scope: 'site' },
  { id: 'sports', label: 'Sports', short: 'Sports', program: 'programs', unit: 'attendances', activeDays: 'all', kind: 'attendance', defaultSpanDays: 7, scope: 'site' },
  { id: 'art', label: 'Art lessons', short: 'Art', program: 'programs', unit: 'attendances', activeDays: 'all', kind: 'attendance', defaultSpanDays: 7, scope: 'site' },
  { id: 'tailoring', label: 'Tailoring lessons', short: 'Tailoring', program: 'programs', unit: 'attendances', activeDays: 'all', kind: 'attendance', defaultSpanDays: 7, scope: 'site' },
  { id: 'carpentry', label: 'Carpentry lessons', short: 'Carpentry', program: 'programs', unit: 'attendances', activeDays: 'all', kind: 'attendance', defaultSpanDays: 7, scope: 'site' },
  { id: 'computer_lab', label: 'Computer lab', short: 'Computer lab', program: 'programs', unit: 'attendances', activeDays: 'weekdays', kind: 'attendance', defaultSpanDays: 5, scope: 'site' },
  { id: 'holiday_camp', label: 'Holiday camps', short: 'Holiday camps', program: 'programs', unit: 'attendances', activeDays: 'all', kind: 'attendance', defaultSpanDays: 5, scope: 'site' },
  { id: 'agronomy_attendees', label: 'Agronomy attendees', short: 'Agronomy', program: 'programs', unit: 'attendees', activeDays: 'all', kind: 'attendance', defaultSpanDays: 1, scope: 'site' },
  { id: 'agronomy_workshops', label: 'Agronomy workshops', short: 'Workshops', program: 'programs', unit: 'workshops', activeDays: 'all', kind: 'flow', defaultSpanDays: 1, scope: 'site' },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<MetricId, MetricDef>;

export const PROGRAMS: { id: ProgramId; label: string }[] = [
  { id: 'meals', label: 'Meals' },
  { id: 'library', label: 'Library' },
  { id: 'mentorship', label: 'Teaching & Mentoring' },
  { id: 'programs', label: 'Programs' },
];

/** The meals count: school lunches at the three partner primary schools. */
export const MEAL_SCHOOLS: MetricId[] = ['meals_amagoro', 'meals_kidek', 'meals_ikapolok'];
/** Meals for staff and tailoring students. Never part of the meals count; shown to managers only. */
export const STAFF_MEALS: MetricId[] = ['meals_staff_tailoring'];
/** Metrics that only managers' browsers receive. */
export const MANAGER_ONLY_METRICS: ReadonlySet<MetricId> = new Set(STAFF_MEALS);
/** Teaching & Mentoring: contact hours, classroom and mentorship. */
export const TEACHING_METRICS: MetricId[] = ['contact_classroom', 'contact_mentorship'];
export const TEACHING_LEVELS: TeachingLevel[] = ['Primary', 'Junior Secondary', 'Secondary'];
/** Old lesson counts become estimated classroom hours: one lesson is 40 minutes. */
export const LESSON_HOURS = 40 / 60;
/**
 * A report averaging more than this many contact hours a school day gets a "worth a look"
 * note: usually minutes typed as hours. Roughly 25 mentors × 8 hours, so no setting is needed.
 */
export const MAX_REPORT_HOURS_PER_DAY = 200;

/** Reports sent on or after this date split books checked out by location. */
export const BOOKS_SPLIT_FROM = '2026-10-22';
export const BOOK_LOCATIONS: { id: BookLocation; label: string }[] = [
  { id: 'main', label: 'Main library' },
  { id: 'satellite', label: 'Satellite libraries' },
  { id: 'outreach', label: 'Outreach schools' },
  { id: 'klc', label: 'KLC' },
];
export const UNSPLIT_BOOKS_LABEL = 'All locations (not split)';
export const ENRICHMENT: MetricId[] = ['sports', 'art', 'tailoring', 'carpentry', 'computer_lab', 'holiday_camp', 'agronomy_attendees'];

/** Activity streams used for "programs reporting" counts and freshness. */
export const STREAMS: { id: string; label: string; metrics: MetricId[] }[] = [
  { id: 'meals', label: 'School meals', metrics: MEAL_SCHOOLS },
  { id: 'staff_meals', label: 'Staff & tailoring meals', metrics: STAFF_MEALS },
  { id: 'library', label: 'Library', metrics: ['library_visits', 'books_checked_out', 'library_lessons'] },
  { id: 'mentorship', label: 'Teaching & Mentoring', metrics: TEACHING_METRICS },
  { id: 'sports', label: 'Sports', metrics: ['sports'] },
  { id: 'art', label: 'Art', metrics: ['art'] },
  { id: 'tailoring', label: 'Tailoring', metrics: ['tailoring'] },
  { id: 'carpentry', label: 'Carpentry', metrics: ['carpentry'] },
  { id: 'computer_lab', label: 'Computer lab', metrics: ['computer_lab'] },
  { id: 'holiday_camp', label: 'Holiday camps', metrics: ['holiday_camp'] },
  { id: 'agronomy', label: 'Agronomy', metrics: ['agronomy_attendees', 'agronomy_workshops'] },
];

export const PROGRAM_IDS = new Set<string>(PROGRAMS.map((p) => p.id));
