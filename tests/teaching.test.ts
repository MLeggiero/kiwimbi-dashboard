import { describe, expect, it } from 'vitest';
import { FORM_HEADER } from '../dev/fake-sheet';
import { parseTeachingHeader } from '../shared/headers';
import { LESSON_HOURS } from '../shared/metrics';
import { toPublicPayload } from '../shared/payload';
import { highHours, parseCount, runPipeline, type Cell } from '../shared/pipeline';
import type { Fact } from '../shared/types';
import { buildDataset, estKey, locKey, MAIN_BOOKS } from '../src/lib/dataset';
import { rangeStats } from '../src/lib/series';
import { likeForLike } from '../src/lib/teaching';
import { isoToDay } from '../shared/dates';

// Library lessons, books by location and contact hours (October 2026 form changes).

const opts = { today: '2026-11-13', timezone: 'Africa/Nairobi', generatedAt: '', hashName: (n: string) => `id_${n}` };
const d = isoToDay;

const NEW = new Set([
  'Number of Library Lessons Given',
  'Number of Books Checked Out (Satellite Libraries)',
  'Number of Books Checked Out (Outreach Schools)',
  'Number of Books Checked Out (KLC)',
  'Starting Date (Teaching / Mentoring)',
  'Ending Date (Teaching / Mentoring)',
]);
const isNew = (h: string) => NEW.has(h) || /contact hours/i.test(h);
const WITH_NEW = FORM_HEADER.filter((h) => h !== 'Anything else to share?');
const WITHOUT_NEW = WITH_NEW.filter((h) => !isNew(h));

function sheet(rows: Record<string, Cell>[], header = WITH_NEW) {
  return { header, rows: rows.map((r) => header.map((h) => r[h] ?? null)) };
}

const hours = (school: string, classroom: Cell, mentorship: Cell, s = '2026-11-02', e = '2026-11-06'): Record<string, Cell> => ({
  Timestamp: `${e}T16:00:00`,
  'First and Last Name:': `${school} Coordinator`,
  'Starting Date (Teaching / Mentoring)': s,
  'Ending Date (Teaching / Mentoring)': e,
  [`Classroom Contact Hours (${school})`]: classroom,
  [`Mentorship Contact Hours (${school})`]: mentorship,
});

const library = (ts: string, books: Record<string, Cell>, lessons: Cell = null): Record<string, Cell> => ({
  Timestamp: ts,
  'First and Last Name:': 'Library Lead',
  'Number of Library Visits': 400,
  'Starting Date': '2026-10-19',
  'Ending Date': '2026-10-23',
  'Number of Library Lessons Given': lessons,
  'Starting Date 2': '2026-10-19',
  'Ending Date 2': '2026-10-23',
  ...books,
});

describe('teaching headers', () => {
  it('reads activity, site and level, checking Junior Secondary before Secondary', () => {
    expect(parseTeachingHeader('Classroom Contact Hours (Kidek Junior Secondary)')).toEqual({
      metric: 'contact_classroom',
      school: { label: 'Kidek Junior Secondary', site: 'Kidek', level: 'Junior Secondary' },
    });
    expect(parseTeachingHeader('Mentorship  Contact Hours\n(Amagoro Secondary)')).toEqual({
      metric: 'contact_mentorship',
      school: { label: 'Amagoro Secondary', site: 'Amagoro', level: 'Secondary' },
    });
    expect(parseTeachingHeader('Classroom Contact Hours (Ikapolok Primary)')).toMatchObject({ school: { site: 'Ikapolok', level: 'Primary' } });
  });

  it('flags a teaching header it cannot read, and ignores other columns', () => {
    expect(parseTeachingHeader('Classroom Contact Hours (Kidek Grade 7)')).toBe('bad');
    expect(parseTeachingHeader('Classroom Contact Hours Kidek Primary')).toBe('bad');
    expect(parseTeachingHeader('Number of Library Visits')).toBeNull();
    const r = runPipeline(sheet([], [...WITH_NEW, 'Classroom Contact Hours (Kidek Grade 7)']), opts);
    expect(r.issues.filter((i) => i.type === 'header_format')).toHaveLength(1);
    expect(r.unmappedColumns).toEqual([]);
  });

  it('finds a new school from the header alone', () => {
    const header = [...WITH_NEW, 'Classroom Contact Hours (Amagoro Secondary)'];
    const r = runPipeline(sheet([{ ...hours('Amagoro Secondary', 30, null) }], header), opts);
    expect(r.facts).toMatchObject([{ m: 'contact_classroom', sch: 'Amagoro Secondary', site: 'Amagoro', lvl: 'Secondary', v: 30 }]);
  });
});

describe('new columns', () => {
  const missing = (r: ReturnType<typeof runPipeline>) => r.issues.filter((i) => i.type === 'missing_column' || i.type === 'unmapped_column');

  it('work when the new columns are absent', () => {
    const r = runPipeline(sheet([library('2026-10-24T09:00:00', { 'Number of Books Checked Out': 300 })], WITHOUT_NEW), opts);
    expect(missing(r)).toEqual([]);
    expect(r.facts.map((f) => f.m)).toEqual(['library_visits', 'books_checked_out']);
  });

  it('work when they are present but empty', () => {
    const r = runPipeline(sheet([library('2026-10-24T09:00:00', { 'Number of Books Checked Out': 300 })]), opts);
    expect(missing(r)).toEqual([]);
    expect(r.facts).toHaveLength(2);
  });

  it('read every new value when filled in', () => {
    const r = runPipeline(
      sheet([
        library('2026-10-24T09:00:00', { 'Number of Books Checked Out': 300, 'Number of Books Checked Out (Satellite Libraries)': 120, 'Number of Books Checked Out (Outreach Schools)': 80, 'Number of Books Checked Out (KLC)': 10 }, 6),
        hours('Kidek Junior Secondary', 52.5, '.5'),
      ]),
      opts,
    );
    expect(missing(r)).toEqual([]);
    expect(r.facts.map((f) => [f.m, f.loc ?? f.sch ?? '', f.v])).toEqual([
      ['library_visits', '', 400],
      ['library_lessons', '', 6],
      ['books_checked_out', 'main', 300],
      ['books_checked_out', 'satellite', 120],
      ['books_checked_out', 'outreach', 80],
      ['books_checked_out', 'klc', 10],
      ['contact_classroom', 'Kidek Junior Secondary', 52.5],
      ['contact_mentorship', 'Kidek Junior Secondary', 0.5],
    ]);
  });
});

describe('books by location', () => {
  it('counts the main question as the main library from 2026-10-22, and as unsplit before', () => {
    const r = runPipeline(
      sheet([library('2026-10-21T18:00:00', { 'Number of Books Checked Out': 250 }), library('2026-10-22T08:00:00', { 'Number of Books Checked Out': 260, 'Number of Books Checked Out (Satellite Libraries)': 90 })]),
      opts,
    );
    const books = r.facts.filter((f) => f.m === 'books_checked_out');
    expect(books.map((f) => [f.v, f.loc ?? 'unsplit'])).toEqual([
      [250, 'unsplit'],
      [260, 'main'],
      [90, 'satellite'],
    ]);
    // Different locations over the same dates are not overlaps.
    expect(r.issues.filter((i) => i.type === 'overlap' && i.metric === 'books_checked_out' && i.row === 3)).toEqual([]);
    const ds = buildDataset(toPublicPayload(r, { email: '', isManager: true }, opts.today));
    const week: [number, number] = [d('2026-10-19'), d('2026-10-23')];
    expect(rangeStats(ds, ['books_checked_out'], ...week).total).toBeCloseTo(600);
    expect(rangeStats(ds, MAIN_BOOKS, ...week).total).toBeCloseTo(510);
    expect(rangeStats(ds, [locKey('satellite')], ...week).total).toBeCloseTo(90);
  });
});

describe('old lesson counts', () => {
  const lessons = (n: Cell, extra: Record<string, Cell> = {}) => ({
    Timestamp: '2026-10-06T16:00:00',
    'First and Last Name:': 'Mentor Amani',
    'Number of Primary School Classes Taught': n,
    'Starting Date 3': '2026-10-06',
    'Ending Date 3': '2026-10-06',
    ...extra,
  });

  it('become estimated classroom hours at 40 minutes a lesson, with no school or level', () => {
    const r = runPipeline(sheet([lessons(6)]), opts);
    expect(r.facts).toHaveLength(1);
    expect(r.facts[0]).toMatchObject({ m: 'contact_classroom', est: 1 });
    expect(r.facts[0].v).toBeCloseTo(6 * LESSON_HOURS);
    expect(r.facts[0].v).toBeCloseTo(4);
    expect(r.facts[0].sch).toBeUndefined();
  });

  it('give way to contact hours in the same row, with a note', () => {
    const r = runPipeline(sheet([lessons(6, { 'Starting Date (Teaching / Mentoring)': '2026-10-06', 'Ending Date (Teaching / Mentoring)': '2026-10-06', 'Mentorship Contact Hours (Kidek Primary)': 3 })]), opts);
    expect(r.facts.map((f) => [f.m, f.est ?? 0, f.v])).toEqual([['contact_mentorship', 0, 3]]);
    expect(r.issues).toMatchObject([{ row: 2, type: 'mixed_teaching', excluded: true }]);
  });
});

describe('the high-hours check', () => {
  const fact = (v: number): Fact => ({ m: 'contact_classroom', s: '2026-11-02', e: '2026-11-06', v, t: '2026-11-06', sch: 'Kidek Primary' });

  it('flags more than 200 hours a school day in one report, keeps the value, and needs no settings', () => {
    expect(highHours([fact(7500)])).toMatch(/Worth a look/);
    expect(highHours([fact(500)])).toBeNull();
    const r = runPipeline(sheet([hours('Kidek Primary', 7500, null)]), opts);
    expect(r.issues).toMatchObject([{ row: 2, type: 'high_hours', excluded: false }]);
    expect(r.facts[0].v).toBe(7500);
  });
});

describe('parseCount', () => {
  it('accepts leading-dot decimals', () => {
    expect(parseCount('.5')).toBe(0.5);
    expect(parseCount('8.5')).toBe(8.5);
    expect(parseCount('.')).toBeNull();
    expect(parseCount('5.')).toBeNull();
  });
});

describe('comparing across the switch', () => {
  const r = runPipeline(
    sheet([
      { Timestamp: '2026-10-09T16:00:00', 'First and Last Name:': 'Mentor Amani', 'Number of Primary School Classes Taught': 30, 'Starting Date 3': '2026-10-05', 'Ending Date 3': '2026-10-09' },
      hours('Kidek Primary', 25, 20, '2026-11-02', '2026-11-06'),
    ]),
    opts,
  );
  const ds = buildDataset(toPublicPayload(r, { email: '', isManager: true }, opts.today));
  const before: [number, number] = [d('2026-10-05'), d('2026-10-09')];
  const after: [number, number] = [d('2026-11-02'), d('2026-11-06')];

  it('compares classroom hours only when a period is estimated', () => {
    expect(likeForLike(ds, ['contact_classroom', 'contact_mentorship'], after, before)).toEqual({ keys: ['contact_classroom'], basis: 'classroom' });
    expect(likeForLike(ds, ['contact_mentorship'], after, before).basis).toBe('new');
    expect(likeForLike(ds, ['contact_classroom', 'contact_mentorship'], after, after).basis).toBe('all');
    expect(rangeStats(ds, [estKey('contact_classroom')], ...before).total).toBeCloseTo(20);
  });

  it('sums contact hours: classroom and mentorship together', () => {
    expect(rangeStats(ds, ['contact_classroom', 'contact_mentorship'], ...after).total).toBeCloseTo(45);
  });
});
