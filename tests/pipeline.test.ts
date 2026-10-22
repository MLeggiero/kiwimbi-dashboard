import { describe, expect, it } from 'vitest';
import { findColumn, parseCount, runPipeline, type Cell } from '../shared/pipeline';
import { toOpsPayload, toPublicPayload } from '../shared/payload';
import { FORM_HEADER, makeFakeSheet } from '../dev/fake-sheet';

const opts = {
  today: '2026-09-23',
  timezone: 'Africa/Nairobi',
  generatedAt: '2026-09-23T07:00:00.000Z',
  hashName: (n: string) => 'id_' + n.toLowerCase().replace(/\s+/g, '_'),
};

// The synthetic header has one extra "new question" column; most tests use the form's own columns.
const BASE = FORM_HEADER.filter((h) => h !== 'Anything else to share?');
const SPORTS_START = FORM_HEADER.find((h) => h.startsWith('Starting Date\n') && h.endsWith('(Sports)'))!;
const SPORTS_END = FORM_HEADER.find((h) => h.startsWith('Ending Date\n') && h.endsWith('(Sports)'))!;

function sheet(rows: Record<string, Cell>[], header = BASE) {
  return { header, rows: rows.map((r) => header.map((h) => r[h] ?? null)) };
}

const meals = (name: string, v: Cell, s: string | null, e: string | null, ts = '2026-09-12T09:00:00'): Record<string, Cell> => ({
  Timestamp: ts,
  'First and Last Name:': name,
  'Number of Meals Distributed (Amagoro Primary)': v,
  'Starting Date 5': s,
  'Ending Date 5': e,
});

describe('parseCount', () => {
  it('accepts plain numbers only', () => {
    expect(parseCount(12)).toBe(12);
    expect(parseCount('1,500')).toBe(1500);
    expect(parseCount(' 40 ')).toBe(40);
    expect(parseCount('7.5')).toBe(7.5);
    expect(parseCount('20-25')).toBeNull();
    expect(parseCount('about 40')).toBeNull();
    expect(parseCount('1,50')).toBeNull();
    expect(parseCount('')).toBeNull();
    expect(parseCount(Number.NaN)).toBeNull();
  });
});

describe('findColumn', () => {
  const header = ['timestamp', 'starting date', 'ending date', 'number of x', 'starting date', 'ending date'];

  it('finds exact titles, and treats "Name N" as the Nth column titled "Name"', () => {
    expect(findColumn(header, 'Starting Date')).toBe(1);
    expect(findColumn(header, 'Starting Date 2')).toBe(4);
    expect(findColumn(header, 'Ending  Date 2')).toBe(5);
    expect(findColumn(header, 'Starting Date 3')).toBe(-1);
    expect(findColumn(header, 'Number of X')).toBe(3);
    expect(findColumn(['a', 'starting date 2'], 'Starting Date 2')).toBe(1);
  });
});

/** The live sheet repeats titles ("Starting Date" ×10) and leaves unnamed columns blank. */
const liveStyle = (h: string) => h.replace(/^(Starting|Ending) Date \d+$/, '$1 Date').replace(/^Column 33$/, '');

describe('runPipeline', () => {
  it('turns a report into a fact with its dates, value, reporter and submission date', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-09-07', '2026-09-11')]), opts);
    expect(r.facts).toEqual([{ m: 'meals_amagoro', s: '2026-09-07', e: '2026-09-11', v: 900, t: '2026-09-12', row: 2, r: 'id_jane_doe' }]);
    expect(r.reporters).toEqual({ id_jane_doe: 'Jane Doe' });
    expect(r.issues).toEqual([]);
  });

  it('reads several metrics from one row, including typed-date columns with line breaks', () => {
    const r = runPipeline(
      sheet([
        {
          ...meals('Jane Doe', 900, '2026-09-07', '2026-09-11'),
          'Number of Students Attending Sports Programs': 120,
          [SPORTS_START]: '2026-09-07',
          [SPORTS_END]: '2026-09-13',
        },
      ]),
      opts,
    );
    expect(r.facts.map((f) => f.m).sort()).toEqual(['meals_amagoro', 'sports']);
  });

  it('rejects text in number fields instead of stripping digits', () => {
    const r = runPipeline(sheet([meals('Jane Doe', '20-25', '2026-09-07', '2026-09-11'), meals('Jane Doe', '1,250', '2026-09-14', '2026-09-18')]), opts);
    expect(r.facts.map((f) => f.v)).toEqual([1250]);
    expect(r.issues).toMatchObject([{ row: 2, type: 'non_numeric', excluded: true }]);
  });

  it('assumes an ending date from the metric default when it is missing', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 500, '2026-09-07', null)]), opts);
    expect(r.facts[0]).toMatchObject({ s: '2026-09-07', e: '2026-09-11', a: 1 });
    expect(r.issues).toMatchObject([{ type: 'assumed_dates', excluded: false }]);
  });

  it('excludes impossible dates, infers a missing start, and flags long spans', () => {
    const r = runPipeline(
      sheet([
        meals('Jane Doe', 100, '2026-09-11', '2026-09-07'),
        meals('Jane Doe', 100, '2016-03-12', '2016-03-12'),
        meals('Jane Doe', 100, '2026-10-20', '2026-10-24'),
        meals('Jane Doe', 100, null, '2026-09-07'),
        meals('Jane Doe', 5000, '2026-01-05', '2026-05-29'),
      ]),
      opts,
    );
    expect(r.issues.map((i) => [i.type, i.excluded])).toEqual([
      ['end_before_start', true],
      ['date_out_of_range', true],
      ['date_out_of_range', true],
      ['assumed_dates', false],
      ['long_span', false],
    ]);
    expect(r.facts.map((f) => [f.v, f.s, f.e])).toEqual([
      [100, '2026-09-03', '2026-09-07'],
      [5000, '2026-01-05', '2026-05-29'],
    ]);
  });

  it('drops exact duplicates and flags overlapping reports', () => {
    const r = runPipeline(
      sheet([
        meals('Jane Doe', 900, '2026-09-07', '2026-09-11'),
        meals('Jane Doe', 900, '2026-09-07', '2026-09-11'),
        meals('Sam Sample', 400, '2026-09-10', '2026-09-11'),
      ]),
      opts,
    );
    expect(r.facts.map((f) => f.v)).toEqual([900, 400]);
    expect(r.issues.map((i) => [i.row, i.type, i.excluded])).toEqual([
      [3, 'duplicate', true],
      [2, 'overlap', false],
    ]);
  });

  it('calls out the same dates and value from different people as a possible duplicate', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-09-07', '2026-09-11'), meals('Sam Sample', 900, '2026-09-07', '2026-09-11')]), opts);
    expect(r.facts).toHaveLength(2);
    expect(r.issues.map((i) => [i.row, i.type])).toEqual([[3, 'possible_duplicate']]);
  });

  it('groups a long report and the reports inside it into one overlap flag', () => {
    const r = runPipeline(
      sheet([
        meals('Jane Doe', 5000, '2026-07-06', '2026-08-28'),
        meals('Sam Sample', 900, '2026-07-06', '2026-07-10'),
        meals('Sam Sample', 950, '2026-07-13', '2026-07-17'),
        meals('Sam Sample', 925, '2026-07-20', '2026-07-24'),
      ]),
      opts,
    );
    expect(r.issues).toMatchObject([{ row: 2, type: 'overlap', detail: expect.stringContaining('rows 3, 4, 5') }]);
  });

  it('recovers missing dates from the same submission, else the submission date, else excludes', () => {
    const r = runPipeline(
      sheet([
        { Timestamp: '2026-03-28T09:00:00', 'First and Last Name:': 'Jane Doe', 'Number of Primary School Classes Taught': 4, 'Starting Date 3': '2026-03-23', 'Ending Date 3': '2026-03-27', 'Number of Secondary School Classes Taught': 2 },
        { Timestamp: '2026-03-20T15:00:00', 'First and Last Name:': 'Jane Doe', 'Number of Primary School Classes Taught': 5 },
        { 'First and Last Name:': 'Jane Doe', 'Number of Primary School Classes Taught': 6 },
      ]),
      opts,
    );
    // Old lesson counts become estimated classroom hours (40 minutes a lesson).
    expect(r.facts.map((f) => [f.m, f.s, f.e, f.a ?? 0, f.est ?? 0, Math.round(f.v * 60)])).toEqual([
      ['contact_classroom', '2026-03-23', '2026-03-27', 0, 1, 160],
      ['contact_classroom', '2026-03-23', '2026-03-27', 1, 1, 80],
      ['contact_classroom', '2026-03-20', '2026-03-20', 1, 1, 200],
    ]);
    expect(r.issues.map((i) => [i.row, i.type, i.excluded])).toEqual([
      [2, 'assumed_dates', false],
      [3, 'assumed_dates', false],
      [4, 'missing_dates', true],
    ]);
  });

  it('only flags class-log overlaps from the same mentor', () => {
    const classes = (name: string) => ({ Timestamp: '2026-09-08T10:00:00', 'First and Last Name:': name, 'Number of Primary School Classes Taught': 3, 'Starting Date 3': '2026-09-08', 'Ending Date 3': '2026-09-08' });
    const r = runPipeline(sheet([classes('Jane Doe'), classes('Sam Sample')]), opts);
    expect(r.facts).toHaveLength(2);
    expect(r.issues).toEqual([]);
  });

  it('ignores test submissions and maps name variations', () => {
    const r = runPipeline(
      { ...sheet([meals('Test Test', 99999, '2026-09-07', '2026-09-11'), meals('doe jane', 800, '2026-09-14', '2026-09-18')]), nameMapRows: [['Jane Doe', 'Doe Jane']] },
      opts,
    );
    expect(r.facts).toHaveLength(1);
    expect(r.facts[0].r).toBe('id_jane_doe');
    expect(r.issues).toMatchObject([{ type: 'test_row', excluded: true }]);
    expect(r.rows).toBe(2);
  });

  it('reports unused and missing columns', () => {
    const header = [...BASE.filter((h) => h !== 'Number of Library Visits'), 'A brand new question'];
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-09-07', '2026-09-11')], header), opts);
    expect(r.unmappedColumns).toEqual(['A brand new question']);
    expect(r.issues.filter((i) => i.type === 'missing_column').map((i) => i.metric)).toEqual(['library_visits']);
  });

  it('reads the optional terms and targets tabs', () => {
    const r = runPipeline(
      {
        ...sheet([]),
        termsRows: [['Term 3 2026', '2026-08-24', '2026-10-30'], ['Broken', 'soon', '']],
        targetsRows: [['meals', 2026, '90,000'], ['not_a_metric', 2026, 5]],
      },
      opts,
    );
    expect(r.terms).toEqual([{ label: 'Term 3 2026', start: '2026-08-24', end: '2026-10-30' }]);
    expect(r.targets).toEqual([{ key: 'meals', year: 2026, value: 90000 }]);
    expect(r.issues.filter((i) => i.type === 'settings')).toHaveLength(2);
  });

  it('reads repeated column titles (live sheet) exactly like numbered ones (downloads)', () => {
    const numbered = makeFakeSheet({ today: '2026-09-23' });
    const live = { ...numbered, header: numbered.header.map((h) => liveStyle(String(h))) };
    expect(live.header.filter((h) => h === 'Starting Date')).toHaveLength(10);
    const a = runPipeline(numbered, opts);
    const b = runPipeline(live, opts);
    expect(b.issues.filter((i) => i.type === 'missing_column')).toEqual([]);
    expect(b.facts.map((f) => [f.m, f.s, f.e, f.v, f.t])).toEqual(a.facts.map((f) => [f.m, f.s, f.e, f.v, f.t]));
    expect(b.issues.map((i) => [i.row, i.type])).toEqual(a.issues.map((i) => [i.row, i.type]));
  });

  it('names the exact date column it could not find', () => {
    const header = BASE.map((h) => (h === 'Starting Date 5' ? 'Start Day 5' : h));
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-09-07', '2026-09-11')], header), opts);
    expect(r.issues.filter((i) => i.type === 'missing_column').map((i) => i.detail)).toEqual(['Date column "Starting Date 5" for "Number of Meals Distributed (Amagoro Primary)" wasn\'t found.']);
  });

  it('handles the whole synthetic sheet and catches each planted problem', () => {
    const r = runPipeline(makeFakeSheet({ today: '2026-09-23' }), opts);
    expect(r.facts.length).toBeGreaterThan(300);
    const types = new Set(r.issues.map((i) => i.type));
    for (const t of ['test_row', 'non_numeric', 'date_out_of_range', 'assumed_dates', 'end_before_start', 'long_span', 'duplicate', 'overlap', 'unmapped_column'] as const) {
      expect(types, t).toContain(t);
    }
    expect(r.issues.some((i) => i.type === 'missing_column')).toBe(false);
    expect(r.facts.some((f) => f.m === 'meals_amagoro' && f.s === '2026-01-12' && f.e === '2026-03-20')).toBe(true);
  });
});

describe('DATA_START (the current round of reporting)', () => {
  const start = { ...opts, dataStart: '2026-09-09' };

  it('leaves out reports that end before the start, and trims one that runs across it', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-08-31', '2026-09-04'), meals('Jane Doe', 1000, '2026-09-07', '2026-09-11'), meals('Jane Doe', 700, '2026-09-14', '2026-09-18')]), start);
    // Mon 7 – Fri 11 has five school days; from Wed 9 on, three of them remain.
    expect(r.facts.map((f) => [f.s, f.e, f.v])).toEqual([
      ['2026-09-09', '2026-09-11', 600],
      ['2026-09-14', '2026-09-18', 700],
    ]);
    expect(r.scope).toEqual({ start: '2026-09-09', droppedValues: 1, droppedRows: 1 });
    expect(r.rows).toBe(2);
  });

  it('drops issues and submissions from earlier rows, but keeps problems sent after the start', () => {
    const r = runPipeline(
      sheet([
        meals('Jane Doe', 'about 40', '2026-08-31', '2026-09-04', '2026-09-04T12:00:00'),
        meals('Jane Doe', '20-25', '2026-09-14', '2026-09-18', '2026-09-18T12:00:00'),
        meals('Jane Doe', 500, '2026-09-14', '2026-09-18', '2026-09-19T12:00:00'),
      ]),
      start,
    );
    expect(r.issues.map((i) => [i.row, i.type])).toEqual([[3, 'non_numeric']]);
    expect(r.submissions.map((s) => s.row)).toEqual([3, 4]);
  });

  it('checks overlaps only between reports inside the period', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-08-24', '2026-09-08'), meals('Sam Sample', 400, '2026-09-07', '2026-09-08')]), start);
    expect(r.facts).toEqual([]);
    expect(r.issues.filter((i) => i.type === 'overlap')).toEqual([]);
  });

  it('changes nothing when no start is set', () => {
    const r = runPipeline(sheet([meals('Jane Doe', 900, '2026-08-31', '2026-09-04')]), opts);
    expect(r.facts).toHaveLength(1);
    expect(r.scope).toBeNull();
  });
});

describe('payloads', () => {
  const clean = runPipeline(makeFakeSheet({ today: '2026-09-23' }), opts);

  const viewer = { email: 'viewer@example.org', isManager: false };

  it('sends viewers only the allowed fields: no names, ids, row numbers, links or raw text', () => {
    const p = toPublicPayload(clean, viewer, '2026-09-23');
    expect(Object.keys(p).sort()).toEqual(['facts', 'generatedAt', 'latestSubmission', 'mentors', 'quality', 'targets', 'terms', 'timezone', 'today', 'version', 'viewer']);
    for (const f of p.facts) for (const k of Object.keys(f)) expect(['m', 's', 'e', 'v', 't', 'a', 'est', 'loc', 'sch', 'site', 'lvl']).toContain(k);
    expect(p.quality).toBeNull();
    expect(Object.keys(p.viewer).sort()).toEqual(['email', 'isManager']);
    const json = JSON.stringify(p);
    for (const name of Object.values(clean.reporters)) expect(json).not.toContain(name);
    for (const id of Object.keys(clean.reporters)) expect(json).not.toContain(id);
    for (const leak of ['drive.google.com', '"row"', '"r"', 'detail', 'about 4', 'A note typed into a new question']) expect(json).not.toContain(leak);
  });

  it('keeps staff and tailoring meals and report counts for managers only', () => {
    const staff = clean.facts.filter((f) => f.m === 'meals_staff_tailoring');
    expect(staff.length).toBeGreaterThan(0);
    const forViewer = toPublicPayload(clean, viewer, '2026-09-23');
    expect(forViewer.facts.some((f) => f.m === 'meals_staff_tailoring')).toBe(false);
    expect(forViewer.facts).toHaveLength(clean.facts.length - staff.length);
    const forManager = toPublicPayload(clean, { email: 'manager@example.org', isManager: true }, '2026-09-23');
    expect(forManager.facts).toHaveLength(clean.facts.length);
    expect(Object.keys(forManager.quality ?? {}).sort()).toEqual(['excluded', 'flagged', 'rows', 'used']);
    expect(forManager.quality?.used).toBe(clean.facts.length);
  });

  it('pre-counts distinct mentors per week, month, term and preset range', () => {
    const p = toPublicPayload(clean, viewer, '2026-09-23');
    const mentorFacts = clean.facts.filter((f) => f.m.startsWith('contact_'));
    const distinct = (from: string, to: string) => new Set(mentorFacts.filter((f) => f.e >= from && f.s <= to).map((f) => f.r)).size;
    expect(p.mentors.week['2026-09-07']).toBe(distinct('2026-09-07', '2026-09-13'));
    expect(p.mentors.month['2026-03']).toBe(distinct('2026-03-01', '2026-03-31'));
    expect(p.mentors.term['Term 1 2026']).toBe(distinct('2026-01-05', '2026-04-02'));
    expect(p.mentors.range['2026-01-01|2026-09-23']).toBe(distinct('2026-01-01', '2026-09-23'));
    // One entry per preset range (presets that cover the same dates share one).
    expect(p.mentors.range['2026-09-17|2026-09-23']).toBe(distinct('2026-09-17', '2026-09-23'));
    expect(p.mentors.range['2026-08-24|2026-09-23']).toBe(distinct('2026-08-24', '2026-09-23'));
    expect(p.mentors.range['2026-06-24|2026-09-23']).toBe(distinct('2026-06-24', '2026-09-23'));
  });

  it('gives managers names and row-level issues', () => {
    const ops = toOpsPayload(clean);
    expect(ops.reporters.map((r) => r.name)).toContain('Mentor Baraka');
    expect(ops.reporters.map((r) => r.name)).not.toContain('mentor baraka');
    expect(ops.issues.some((i) => i.row !== null)).toBe(true);
  });
});
