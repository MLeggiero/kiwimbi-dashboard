import type { MetricId } from './types';

// Maps the Google Form's column headers to dashboard metrics. Schema only.
// Headers are compared after collapsing whitespace and lower-casing, so line breaks
// and double spaces in question titles don't matter. If a question is renamed in the
// form, update the matching string here; the Data health page lists unmatched columns.

export interface ColumnSpec {
  metric: MetricId;
  value: string;
  start: string;
  end: string;
}

const typed = (label: string) => ({
  start: `Starting Date Input the MONTH / DAY / YEAR (${label})`,
  end: `Ending Date Input the MONTH / DAY / YEAR (${label})`,
});

export const COLUMN_SPECS: ColumnSpec[] = [
  { metric: 'library_visits', value: 'Number of Library Visits', start: 'Starting Date', end: 'Ending Date' },
  { metric: 'books_checked_out', value: 'Number of Books Checked Out', start: 'Starting Date 2', end: 'Ending Date 2' },
  { metric: 'classes_primary', value: 'Number of Primary School Classes Taught', start: 'Starting Date 3', end: 'Ending Date 3' },
  { metric: 'agronomy_attendees', value: 'Number of Agronomy Class Attendees', start: 'Starting Date 4', end: 'Ending Date 4' },
  { metric: 'agronomy_workshops', value: 'Number of Agronomy Workshops', start: 'Starting Date 4', end: 'Ending Date 4' },
  { metric: 'meals_amagoro', value: 'Number of Meals Distributed (Amagoro Primary)', start: 'Starting Date 5', end: 'Ending Date 5' },
  { metric: 'classes_secondary', value: 'Number of Secondary School Classes Taught', start: 'Starting Date 6', end: 'Ending Date 6' },
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
