// Synthetic stand-in for the Google Sheet, used by local development and tests.
// Every name and number here is invented. The column layout mirrors the real form
// (schema only) and the generator deliberately includes the data problems the
// pipeline must catch: typos, text in number fields, duplicates, overlaps, gaps.

import type { Cell, SheetExport } from '../shared/pipeline';
import { dayToIso, isoToDay, isWeekday, startOfWeek } from '../shared/dates';

export const FORM_HEADER: string[] = [
  'Timestamp',
  'First and Last Name:',
  'What type of submissions are you making?',
  'File Upload',
  'Program Type',
  'Number of Library Visits',
  'Starting Date',
  'Ending Date',
  'Number of Books Checked Out',
  'Starting Date 2',
  'Ending Date 2',
  'Number of Primary School Classes Taught',
  'Starting Date 3',
  'Ending Date 3',
  'Number of Agronomy Class Attendees',
  'Starting Date 4',
  'Ending Date 4',
  'Number of Meals Distributed (Amagoro Primary)',
  'Starting Date 5',
  'Ending Date 5',
  'Do you want to submit other data?',
  'Starting Date 6',
  'Number of Secondary School Classes Taught',
  'Ending Date 6',
  'Number of Meals Distributed (Kidek Primary)',
  'Starting Date 7',
  'Ending Date 7',
  'Number of Meals Distributed (Ikapolok Primary)',
  'Starting Date 8',
  'Ending Date 8',
  'Number of Meals Distributed (Staff and Tailoring)',
  'Starting Date 9',
  'Ending Date 9',
  'Starting Date\nInput the MONTH / DAY / YEAR   (Holiday Camp)',
  'Ending Date\nInput the MONTH / DAY / YEAR  (Holiday Camp)',
  'Number of Students Attending Holiday Camps',
  'Number of Agronomy Workshops',
  'Number of Students Using Computer Lab',
  'Starting Date\nInput the MONTH / DAY / YEAR (Computer Lab)',
  'Ending Date\nInput the MONTH / DAY / YEAR (Computer Lab)',
  'Number of Students Attending Art Lessons',
  'Number of Students Attending Sports Programs',
  'Number of Students Attending Tailoring Lessons',
  'Number of Students Attending Carpentry Lessons',
  'Ending Date\nInput the MONTH / DAY / YEAR (Art Lessons)',
  'Starting Date\nInput the MONTH / DAY / YEAR (Art Lessons)',
  'Starting Date\nInput the MONTH / DAY / YEAR (Tailoring Lessons)',
  'Starting Date\nInput the MONTH / DAY / YEAR (Carpentry Lessons)',
  'Ending Date\nInput the MONTH / DAY / YEAR (Sports)',
  'Ending Date\nInput the MONTH / DAY / YEAR (Tailoring Lessons)',
  'Ending Date\nInput the MONTH / DAY / YEAR (Carpentry Lessons)',
  'Starting Date\nInput the MONTH / DAY / YEAR (Sports)',
  'Starting Date 10',
  'Ending Date 10',
  'Column 33',
  'Anything else to share?',
];

/** Invented school calendar used only by the fake data. */
export const FAKE_TERMS: [string, string, string][] = [
  ['Term 1 2025', '2025-01-06', '2025-04-04'],
  ['Term 2 2025', '2025-04-28', '2025-08-01'],
  ['Term 3 2025', '2025-08-25', '2025-10-24'],
  ['Term 1 2026', '2026-01-05', '2026-04-02'],
  ['Term 2 2026', '2026-04-27', '2026-07-31'],
  ['Term 3 2026', '2026-08-24', '2026-10-30'],
];

const MENTORS = ['Mentor Amani', 'Mentor Baraka', 'Mentor Chebet', 'Mentor Dalia', 'Mentor Eshe', 'Mentor Faraji', 'Mentor Gathoni', 'Mentor Hamisi', 'Mentor Imani', 'Mentor Jabari'];
const VARIANT: Record<string, string> = { 'Mentor Baraka': 'mentor baraka', 'Mentor Chebet': 'Chebet Mentor', 'Mentor Eshe': 'Mentor Eshe.' };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeFakeSheet(opts: { today: string; seed?: number }): SheetExport {
  const rand = mulberry32(opts.seed ?? 20260923);
  const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const chance = (p: number) => rand() < p;
  const today = isoToDay(opts.today);
  const col = (h: string) => FORM_HEADER.indexOf(h);
  const typed = (kind: 'Starting' | 'Ending', label: string) => FORM_HEADER.findIndex((h) => h.startsWith(`${kind} Date\n`) && h.endsWith(`(${label})`));
  const terms = FAKE_TERMS.map(([label, s, e]) => ({ label, s: isoToDay(s), e: isoToDay(e) }));
  const inTerm = (d: number) => terms.some((t) => d >= t.s && d <= t.e);
  const rows: Cell[][] = [];

  const stamp = (day: number) => `${dayToIso(day)}T${String(int(7, 20)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00`;
  function row(name: string, program: string, endDay: number, set: (r: Cell[]) => void, lag = int(0, 3)): Cell[] | null {
    const submitted = endDay + lag;
    if (submitted > today) return null;
    const r: Cell[] = FORM_HEADER.map(() => null);
    r[col('Timestamp')] = stamp(submitted);
    r[col('First and Last Name:')] = name;
    r[col('What type of submissions are you making?')] = 'Data Submissions';
    r[col('Program Type')] = program;
    r[col('Do you want to submit other data?')] = 'No, I am finished.';
    set(r);
    rows.push(r);
    return r;
  }
  const put = (r: Cell[], valueCol: number, startCol: number, endCol: number, v: Cell, s: number | string | null, e: number | string | null) => {
    r[valueCol] = v;
    r[startCol] = typeof s === 'number' ? dayToIso(s) : s;
    r[endCol] = typeof e === 'number' ? dayToIso(e) : e;
  };
  const MEALS: [string, number, number, number, number][] = [
    ['Number of Meals Distributed (Amagoro Primary)', col('Starting Date 5'), col('Ending Date 5'), 160, 200],
    ['Number of Meals Distributed (Kidek Primary)', col('Starting Date 7'), col('Ending Date 7'), 105, 135],
    ['Number of Meals Distributed (Ikapolok Primary)', col('Starting Date 8'), col('Ending Date 8'), 95, 125],
    ['Number of Meals Distributed (Staff and Tailoring)', col('Starting Date 9'), col('Ending Date 9'), 30, 45],
  ];
  const catchUp = { s: isoToDay('2026-01-12'), e: isoToDay('2026-03-20') };
  const enrichmentFrom = isoToDay('2026-07-20');

  for (let mon = startOfWeek(isoToDay('2025-01-06')); mon <= today; mon += 7) {
    const fri = mon + 4;
    const sun = mon + 6;
    if (inTerm(mon) || inTerm(fri)) {
      // Meals: one weekly row covering the schools, unless inside the catch-up period.
      if (!(mon >= catchUp.s && fri <= catchUp.e) && chance(0.88)) {
        row('Meals Lead', 'Meals', fri, (r) => {
          for (const [h, s, e, lo, hi] of MEALS) {
            if (chance(0.9)) put(r, col(h), s, e, [0, 1, 2, 3, 4].reduce((acc) => acc + int(lo, hi), 0), mon, fri);
          }
        });
      }
      // Library: visits and books for the school week.
      if (chance(0.8)) {
        row('Library Lead', 'Library', fri, (r) => {
          const visits = int(350, 650);
          put(r, col('Number of Library Visits'), col('Starting Date'), col('Ending Date'), visits, mon, fri);
          put(r, col('Number of Books Checked Out'), col('Starting Date 2'), col('Ending Date 2'), Math.round(visits * (0.5 + rand() * 0.3)), mon, fri);
        });
      }
      // Mentorship: daily class logs.
      for (let d = mon; d <= fri; d++) {
        if (!inTerm(d) || d > today) continue;
        for (const mentor of MENTORS) {
          if (!chance(0.12)) continue;
          const name = VARIANT[mentor] && chance(0.3) ? VARIANT[mentor] : mentor;
          row(name, 'Teaching / Mentorship', d, (r) => {
            put(r, col('Number of Primary School Classes Taught'), col('Starting Date 3'), col('Ending Date 3'), int(1, 6), d, d);
            if (chance(0.25)) put(r, col('Number of Secondary School Classes Taught'), col('Starting Date 6'), col('Ending Date 6'), int(1, 3), d, d);
          });
        }
      }
      // Enrichment programs began mid-2026, reported weekly (Mon–Sun) under "Library".
      if (mon >= enrichmentFrom && chance(0.9)) {
        row('Programs Lead', 'Library', sun, (r) => {
          put(r, col('Number of Students Attending Sports Programs'), typed('Starting', 'Sports'), typed('Ending', 'Sports'), int(90, 170), mon, sun);
          put(r, col('Number of Students Attending Art Lessons'), typed('Starting', 'Art Lessons'), typed('Ending', 'Art Lessons'), int(25, 60), mon, sun);
          put(r, col('Number of Students Attending Tailoring Lessons'), typed('Starting', 'Tailoring Lessons'), typed('Ending', 'Tailoring Lessons'), 18, mon, sun);
          put(r, col('Number of Students Attending Carpentry Lessons'), typed('Starting', 'Carpentry Lessons'), typed('Ending', 'Carpentry Lessons'), int(8, 10), mon, sun);
        });
      }
      // Computer lab: occasional 1–3 week reports in 2026.
      if (mon >= isoToDay('2026-01-05') && chance(0.22)) {
        const weeks = int(1, 3);
        row('Lab Lead', 'Computer Lab', mon + 7 * (weeks - 1) + 4, (r) => {
          put(r, col('Number of Students Using Computer Lab'), typed('Starting', 'Computer Lab'), typed('Ending', 'Computer Lab'), weeks * int(220, 380), mon, mon + 7 * (weeks - 1) + 4);
        });
      }
    }
  }

  // One catch-up meals report covering most of Term 1 2026 (the kind that used to spike a single month).
  row('Meals Lead', 'Meals', catchUp.e, (r) => {
    let weekdays = 0;
    for (let d = catchUp.s; d <= catchUp.e; d++) if (isWeekday(d)) weekdays++;
    for (const [h, s, e, lo, hi] of MEALS) put(r, col(h), s, e, weekdays * int(lo, hi), catchUp.s, catchUp.e);
  }, 0);
  // Staff meals for early 2025 sent as one long report.
  row('Meals Lead', 'Meals', isoToDay('2025-02-28'), (r) => put(r, col('Number of Meals Distributed (Staff and Tailoring)'), col('Starting Date 9'), col('Ending Date 9'), 1500, '2025-01-06', '2025-02-28'), 2);
  // Holiday camps.
  for (const [s, e] of [['2025-08-11', '2025-08-15'], ['2026-04-13', '2026-04-17'], ['2026-08-10', '2026-08-14']]) {
    row('Programs Lead', 'Holiday Camps', isoToDay(e), (r) => put(r, col('Number of Students Attending Holiday Camps'), typed('Starting', 'Holiday Camp'), typed('Ending', 'Holiday Camp'), int(150, 260), s, e));
  }
  // Agronomy.
  row('Farm Lead', 'Agronomy', isoToDay('2025-02-17'), (r) => put(r, col('Number of Agronomy Class Attendees'), col('Starting Date 4'), col('Ending Date 4'), 84, '2025-02-17', '2025-02-17'));
  row('Farm Lead', 'Agronomy', isoToDay('2025-03-14'), (r) => put(r, col('Number of Agronomy Class Attendees'), col('Starting Date 4'), col('Ending Date 4'), 120, '2025-03-13', '2025-03-14'));
  row('Farm Lead', 'Agronomy', isoToDay('2026-05-07'), (r) => {
    put(r, col('Number of Agronomy Class Attendees'), col('Starting Date 4'), col('Ending Date 4'), 96, '2026-05-07', '2026-05-07');
    r[col('Number of Agronomy Workshops')] = 1;
  });
  // Photo submissions (no numbers; the link must never reach browsers).
  for (let i = 1; i <= 3; i++) {
    row('Programs Lead', '', isoToDay('2026-08-01') + i * 9, (r) => {
      r[col('What type of submissions are you making?')] = 'Photos / Media Submissions';
      r[col('File Upload')] = `https://drive.google.com/open?id=example-photo-${i}`;
      r[col('Program Type')] = null;
    });
  }

  // Deliberate data problems.
  row('Mentor Dalia', 'Teaching / Mentorship', isoToDay('2026-08-26'), (r) => put(r, col('Number of Primary School Classes Taught'), col('Starting Date 3'), col('Ending Date 3'), 'about 4', '2026-08-26', '2026-08-26'));
  row('Library Lead', 'Library', isoToDay('2026-09-04'), (r) => put(r, col('Number of Library Visits'), col('Starting Date'), col('Ending Date'), '1,250', '2026-08-31', '2026-09-04'));
  row('Mentor Faraji', 'Teaching / Mentorship', isoToDay('2026-03-12'), (r) => put(r, col('Number of Primary School Classes Taught'), col('Starting Date 3'), col('Ending Date 3'), 3, '2016-03-12', '2016-03-12'));
  row('Meals Lead', 'Meals', isoToDay('2026-09-11'), (r) => put(r, col('Number of Meals Distributed (Kidek Primary)'), col('Starting Date 7'), col('Ending Date 7'), 610, '2026-09-07', null));
  row('Programs Lead', 'Library', isoToDay('2026-08-30'), (r) => put(r, col('Number of Students Attending Art Lessons'), typed('Starting', 'Art Lessons'), typed('Ending', 'Art Lessons'), 40, '2026-08-30', '2026-08-24'));
  row('Programs Lead', 'Library', isoToDay('2026-09-02'), (r) => put(r, col('Number of Students Attending Sports Programs'), typed('Starting', 'Sports'), typed('Ending', 'Sports'), 55, '2026-08-26', '2026-08-30'));
  row('Lab Lead', 'Computer Lab', isoToDay('2026-05-20'), (r) => put(r, col('Number of Students Using Computer Lab'), typed('Starting', 'Computer Lab'), typed('Ending', 'Computer Lab'), 3100, '2026-02-02', '2026-05-15'));
  row('Test Test', 'Meals', isoToDay('2026-02-10'), (r) => put(r, col('Number of Meals Distributed (Amagoro Primary)'), col('Starting Date 5'), col('Ending Date 5'), 99999, '2026-02-09', '2026-02-10'));
  const tailoring = rows.find((r) => r[col('Number of Students Attending Tailoring Lessons')] !== null);
  if (tailoring) rows.push([...tailoring]);
  const extra = rows.find((r) => r[col('Program Type')] === 'Library');
  if (extra) extra[col('Anything else to share?')] = 'A note typed into a new question.';

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return {
    header: FORM_HEADER,
    rows,
    nameMapRows: [
      ['Canonical Name', 'Variations'],
      ['Mentor Baraka', 'mentor baraka'],
      ['Mentor Chebet', 'Chebet Mentor, Mentor Chebet'],
      ['Mentor Eshe', 'Mentor Eshe.'],
    ],
    termsRows: FAKE_TERMS.filter(([, s]) => isoToDay(s) <= today + 60).map((t) => [...t]),
    targetsRows: [
      ['meals', 2026, 90000],
      ['mentorship', 2026, 900],
    ],
    sheetUrl: null,
  };
}
