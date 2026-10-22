/** Calendar date as 'YYYY-MM-DD' (no time zone attached). */
export type ISODate = string;

export type MetricId =
  | 'meals_amagoro'
  | 'meals_kidek'
  | 'meals_ikapolok'
  | 'meals_staff_tailoring'
  | 'library_visits'
  | 'books_checked_out'
  | 'classes_primary'
  | 'classes_secondary'
  | 'sports'
  | 'art'
  | 'tailoring'
  | 'carpentry'
  | 'computer_lab'
  | 'holiday_camp'
  | 'agronomy_attendees'
  | 'agronomy_workshops';

export type ProgramId = 'meals' | 'library' | 'mentorship' | 'programs';

/** Which days a report's value is spread across: school days only, or every day. */
export type ActiveDays = 'weekdays' | 'all';

/** 'flow' values add up naturally (meals, visits, classes); 'attendance' values are headcounts summed over time. */
export type MetricKind = 'flow' | 'attendance';

export interface MetricDef {
  id: MetricId;
  label: string;
  short: string;
  program: ProgramId;
  site?: string;
  unit: string;
  activeDays: ActiveDays;
  kind: MetricKind;
  /** Assumed length of a report when its ending date is missing. */
  defaultSpanDays: number;
  /** Overlap checks: 'site' = any two reports overlap; 'reporter' = only the same person's reports. */
  scope: 'site' | 'reporter';
}

/** One reported number for one metric over a date range. */
export interface Fact {
  m: MetricId;
  s: ISODate;
  e: ISODate;
  v: number;
  /** Date submitted. */
  t: ISODate;
  /** Pseudonymous reporter id (keyed hash). Server-side only: never sent to browsers. */
  r?: string;
  /** 1 when a date was missing and had to be assumed. */
  a?: 1;
}

export type IssueType =
  | 'test_row'
  | 'non_numeric'
  | 'negative'
  | 'missing_dates'
  | 'assumed_dates'
  | 'end_before_start'
  | 'date_out_of_range'
  | 'long_span'
  | 'duplicate'
  | 'possible_duplicate'
  | 'overlap'
  | 'missing_column'
  | 'unmapped_column'
  | 'settings';

export interface Issue {
  /** Sheet row number (header = row 1). Null for column- or settings-level issues. */
  row: number | null;
  type: IssueType;
  metric?: MetricId;
  /** True when the value was left out of every total. */
  excluded: boolean;
  detail: string;
  reporter?: string;
}

export interface Term {
  label: string;
  start: ISODate;
  end: ISODate;
}

export interface Target {
  /** A metric id or a program id. */
  key: string;
  year: number;
  value: number;
}

export interface Submission {
  row: number;
  reporter: string | null;
  submitted: ISODate | null;
  metrics: MetricId[];
  start: ISODate | null;
  end: ISODate | null;
}

/** Everything the server derives from the sheet. Cached server-side only (it contains names). */
export interface CleanResult {
  generatedAt: string;
  timezone: string;
  latestSubmission: ISODate | null;
  rows: number;
  facts: (Fact & { row: number })[];
  reporters: Record<string, string>;
  issues: Issue[];
  submissions: Submission[];
  unmappedColumns: string[];
  terms: Term[];
  targets: Target[];
  /** Set when DATA_START limits the dashboard to the current round of reporting. */
  scope: { start: ISODate; droppedValues: number; droppedRows: number } | null;
  sheetUrl: string | null;
}

/** Distinct mentors reporting classes, pre-counted on the server for fixed periods. */
export interface MentorCounts {
  /** Per ISO week, keyed by its Monday ('YYYY-MM-DD'). */
  week: Record<string, number>;
  /** Per calendar month, keyed 'YYYY-MM'. */
  month: Record<string, number>;
  /** Per school term, keyed by the term label. */
  term: Record<string, number>;
  /** Per preset date range, keyed 'YYYY-MM-DD|YYYY-MM-DD'. */
  range: Record<string, number>;
}

/** A reported value as browsers see it: no reporter id, no row number. */
export type PublicFact = Omit<Fact, 'r'>;

/** What every allowed viewer's browser receives: no names, no per-person ids, no links, no row numbers. */
export interface PublicPayload {
  version: 1;
  generatedAt: string;
  today: ISODate;
  timezone: string;
  latestSubmission: ISODate | null;
  /** Manager-only metrics (staff and tailoring meals) are left out for other viewers. */
  facts: PublicFact[];
  mentors: MentorCounts;
  terms: Term[];
  targets: Target[];
  /** Report counts from the data checks. Managers only; null for everyone else. */
  quality: { rows: number; used: number; excluded: number; flagged: number } | null;
  viewer: { email: string; isManager: boolean };
}

/** Extra detail for managers only (the Data health page). */
export interface OpsPayload {
  version: 1;
  generatedAt: string;
  reporters: { id: string; name: string }[];
  issues: Issue[];
  submissions: Submission[];
  unmappedColumns: string[];
  sheetUrl: string | null;
}
