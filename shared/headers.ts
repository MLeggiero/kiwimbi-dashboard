import { LESSON_HOURS, TEACHING_LEVELS } from './metrics';
import type { BookLocation, MetricId, TeachingLevel } from './types';

// Maps the Google Form's column headers to dashboard metrics. Schema only.
// Headers are compared after collapsing whitespace and lower-casing, so line breaks
// and double spaces in question titles don't matter. If a question is renamed in the
// form, update the matching string here; the Data health page lists unmatched columns.

export interface ColumnSpec {
  metric: MetricId;
  value: string;
  start: string;
  end: string;
  /** A newer question that may not be in the sheet yet: no "missing column" note without it. */
  optional?: true;
  /** Multiply each value by this (old lesson counts become hours). */
  scale?: number;
  /** Values are estimates (old lesson counts converted to classroom hours). */
  estimated?: true;
  /** Assumed report length when a date is missing, if not the metric's default. */
  span?: number;
  /** Books: a fixed location, or 'by-date' for the main question (main library from BOOKS_SPLIT_FROM). */
  loc?: BookLocation | 'by-date';
  /** Teaching: the school this column reports for. */
  school?: TeachingSchool;
}

export interface TeachingSchool {
  /** As written in the header: "Kidek Junior Secondary". */
  label: string;
  site: string;
  level: TeachingLevel;
}

const typed = (label: string) => ({
  start: `Starting Date Input the MONTH / DAY / YEAR (${label})`,
  end: `Ending Date Input the MONTH / DAY / YEAR (${label})`,
});

export const COLUMN_SPECS: ColumnSpec[] = [
  { metric: 'library_visits', value: 'Number of Library Visits', start: 'Starting Date', end: 'Ending Date' },
  { metric: 'library_lessons', value: 'Number of Library Lessons Given', start: 'Starting Date', end: 'Ending Date', optional: true },
  { metric: 'books_checked_out', value: 'Number of Books Checked Out', start: 'Starting Date 2', end: 'Ending Date 2', loc: 'by-date' },
  { metric: 'books_checked_out', value: 'Number of Books Checked Out (Satellite Libraries)', start: 'Starting Date 2', end: 'Ending Date 2', loc: 'satellite', optional: true },
  { metric: 'books_checked_out', value: 'Number of Books Checked Out (Outreach Schools)', start: 'Starting Date 2', end: 'Ending Date 2', loc: 'outreach', optional: true },
  { metric: 'books_checked_out', value: 'Number of Books Checked Out (KLC)', start: 'Starting Date 2', end: 'Ending Date 2', loc: 'klc', optional: true },
  // Old lesson counts, kept for history once they leave the form: estimated classroom hours.
  { metric: 'contact_classroom', value: 'Number of Primary School Classes Taught', start: 'Starting Date 3', end: 'Ending Date 3', scale: LESSON_HOURS, estimated: true, span: 1 },
  { metric: 'agronomy_attendees', value: 'Number of Agronomy Class Attendees', start: 'Starting Date 4', end: 'Ending Date 4' },
  { metric: 'agronomy_workshops', value: 'Number of Agronomy Workshops', start: 'Starting Date 4', end: 'Ending Date 4' },
  { metric: 'meals_amagoro', value: 'Number of Meals Distributed (Amagoro Primary)', start: 'Starting Date 5', end: 'Ending Date 5' },
  { metric: 'contact_classroom', value: 'Number of Secondary School Classes Taught', start: 'Starting Date 6', end: 'Ending Date 6', scale: LESSON_HOURS, estimated: true, span: 1 },
  { metric: 'meals_kidek', value: 'Number of Meals Distributed (Kidek Primary)', start: 'Starting Date 7', end: 'Ending Date 7' },
  { metric: 'meals_ikapolok', value: 'Number of Meals Distributed (Ikapolok Primary)', start: 'Starting Date 8', end: 'Ending Date 8' },
  { metric: 'meals_staff_tailoring', value: 'Number of Meals Distributed (Staff and Tailoring)', start: 'Starting Date 9', end: 'Ending Date 9' },
  { metric: 'holiday_camp', value: 'Number of Students Attending Holiday Camps', ...typed('Holiday Camp') },
  { metric: 'computer_lab', value: 'Number of Students Using Computer Lab', ...typed('Computer Lab') },
  { metric: 'art', value: 'Number of Students Attending Art Lessons', ...typed('Art Lessons') },
  { metric: 'sports', value: 'Number of Students Attending Sports Programs', ...typed('Sports') },
  { metric: 'tailoring', value: 'Number of Students Attending Tailoring Lessons', ...typed('Tailoring Lessons') },
  { metric: 'carpentry', value: 'Number of Students Attending Carpentry Lessons', ...typed('Carpentry Lessons') },
];

/** Date columns shared by every teaching contact-hours question. Unique titles, so matched exactly. */
export const TEACHING_DATES = { start: 'Starting Date (Teaching / Mentoring)', end: 'Ending Date (Teaching / Mentoring)' };

const TEACHING_PREFIX = /^(classroom|mentorship) contact hours\b/i;
const TEACHING_HEADER = /^(classroom|mentorship) contact hours \((.+)\)$/i;

/**
 * Reads a teaching header: "<Classroom|Mentorship> Contact Hours (<Site> <Level>)", where the
 * level is the last words of the school label ("Junior Secondary" is checked before
 * "Secondary"). Returns null for other columns and 'bad' for a teaching header that doesn't
 * follow the pattern.
 */
export function parseTeachingHeader(header: unknown): { metric: MetricId; school: TeachingSchool } | 'bad' | null {
  const h = String(header ?? '').replace(/\s+/g, ' ').trim();
  if (!TEACHING_PREFIX.test(h)) return null;
  const m = TEACHING_HEADER.exec(h);
  if (!m) return 'bad';
  const label = m[2].trim();
  const lower = label.toLowerCase();
  const level = [...TEACHING_LEVELS].sort((a, b) => b.length - a.length).find((l) => lower.endsWith(` ${l.toLowerCase()}`));
  if (!level) return 'bad';
  const site = label.slice(0, label.length - level.length).trim();
  if (!site) return 'bad';
  return { metric: m[1].toLowerCase() === 'classroom' ? 'contact_classroom' : 'contact_mentorship', school: { label: `${site} ${level}`, site, level } };
}

/** Teaching columns found in the sheet's header row (so a new school only needs a form edit). */
export function teachingSpecs(header: unknown[]): { specs: ColumnSpec[]; bad: string[] } {
  const specs: ColumnSpec[] = [];
  const bad: string[] = [];
  for (const h of header) {
    const p = parseTeachingHeader(h);
    if (p === 'bad') bad.push(String(h).replace(/\s+/g, ' ').trim());
    else if (p) specs.push({ metric: p.metric, value: String(h), ...TEACHING_DATES, school: p.school, optional: true });
  }
  return { specs, bad };
}

export const HEADER_TIMESTAMP = 'Timestamp';
export const HEADER_NAME = 'First and Last Name:';

/** Columns the dashboard knows about but deliberately doesn't chart. */
export const IGNORED_HEADERS = [
  HEADER_TIMESTAMP,
  HEADER_NAME,
  'What type of submissions are you making?',
  'File Upload',
  'Program Type',
  'Do you want to submit other data?',
  'Starting Date 10',
  'Ending Date 10',
  'Column 33',
];

export const normHeader = (h: unknown) =>
  String(h ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
