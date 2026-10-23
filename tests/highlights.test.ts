import { describe, expect, it } from 'vitest';
import { isoToDay } from '../shared/dates';
import type { PublicFact, PublicPayload } from '../shared/types';
import { compareMetrics } from '../src/lib/compare';
import { buildDataset } from '../src/lib/dataset';
import { changeText, highlight, highlightPeriods, periodChange, thinNote } from '../src/lib/highlights';
import { breakNote } from '../src/lib/series';

const d = isoToDay;
const iso = (x: number) => new Date(x * 86_400_000).toISOString().slice(0, 10);

const TERMS = [
  { label: 'Term 2 2026', start: '2026-04-27', end: '2026-07-31' },
  { label: 'Term 3 2026', start: '2026-08-24', end: '2026-11-20' },
];

function payload(facts: PublicFact[], today = '2026-10-23'): PublicPayload {
  return {
    version: 1,
    generatedAt: `${today}T07:00:00Z`,
    today,
    timezone: 'Africa/Nairobi',
    latestSubmission: today,
    facts,
    mentors: { week: {}, month: {}, term: {}, range: {} },
    terms: TERMS,
    targets: [],
    quality: null,
    viewer: { email: 'x@example.org', isManager: true },
  } as PublicPayload;
}

/** 500 meals at Kidek every school week (Mon–Fri) in term, from July 27: 100 a school day. */
function termWeeks(): PublicFact[] {
  const out: PublicFact[] = [];
  for (let s = d('2026-07-27'); s <= d('2026-10-19'); s += 7) {
    if (s >= d('2026-08-03') && s < d('2026-08-24')) continue;
    out.push({ m: 'meals_kidek', s: iso(s), e: iso(s + 4), v: 500, t: iso(s + 5) });
  }
  return out;
}

const ds = buildDataset(payload(termWeeks()));
const terms = ds.terms;

describe('school-break notes', () => {
  it('explains a period that is all or mostly a school break', () => {
    expect(breakNote('August', d('2026-08-01'), d('2026-08-31'), terms)).toBe('August was mostly a school break (Term 3 2026 started Aug 24).');
    expect(breakNote('The week of Aug 10', d('2026-08-10'), d('2026-08-16'), terms)).toBe('The week of Aug 10 was a school break.');
  });

  it('counts break days in a partly broken week, and says nothing in term', () => {
    expect(breakNote('Those days', d('2026-07-27'), d('2026-08-04'), terms)).toBe('Those days included 2 school-break days.');
    expect(breakNote('September', d('2026-09-01'), d('2026-09-30'), terms)).toBeNull();
    expect(breakNote('August', d('2026-08-01'), d('2026-08-31'), [])).toBeNull();
  });
});

describe('highlights', () => {
  const [week, month, year] = highlightPeriods(ds);

  it('uses the last full week and month, and the year so far from the first report', () => {
    expect([week.a, week.b]).toEqual([[d('2026-10-12'), d('2026-10-18')], [d('2026-10-05'), d('2026-10-11')]]);
    expect([month.when, month.vs]).toEqual(['September', 'August']);
    expect([month.a, month.b]).toEqual([[d('2026-09-01'), d('2026-09-30')], [d('2026-08-01'), d('2026-08-31')]]);
    expect(year.title).toBe('Since Jul 27');
    expect(year.b).toEqual([d('2025-07-27'), d('2025-10-23')]);
  });

  it('explains school breaks and where the figures start', () => {
    expect(week.notes).toEqual([]);
    expect(month.notes).toEqual(['August was mostly a school break (Term 3 2026 started Aug 24).']);
    expect(year.notes).toEqual(['Figures start Jul 27, 2026.']);
  });

  it('always shows the change when both periods have figures, even across a break', () => {
    const m = highlight(ds, ['meals_kidek'], month);
    expect(m.a).toBeCloseTo(2200);
    expect(m.b).toBeCloseTo(600);
    expect(m.change).toBeCloseTo(2200 / 600 - 1);
    expect(m.perSchoolDay).toBeCloseTo(100);
    // The takeaway titles still decline this one: August has too few school days with reports.
    const c = { a: { from: month.a[0], to: month.a[1], days: 30 }, b: { from: month.b[0], to: month.b[1], days: 31 }, whole: false, sameLength: false };
    expect(compareMetrics(ds, ['meals_kidek'], c).change).toBeNull();
  });

  it('has no change only when there is nothing to compare with', () => {
    expect(highlight(ds, ['meals_kidek'], week).change).toBeCloseTo(0);
    const y = highlight(ds, ['meals_kidek'], year);
    expect(y.b).toBeNull();
    expect(y.change).toBeNull();
  });

  it('compares daily averages for periods of different lengths when asked', () => {
    const c = periodChange(ds, ['meals_kidek'], [d('2026-09-07'), d('2026-09-13')], [d('2026-09-07'), d('2026-10-04')], true);
    expect(c.change).toBeCloseTo(0);
  });

  it('explains a change worked out on few figures, unless a school break already does', () => {
    const p = { change: 1.5, basis: 'all' as const, a: 500, b: 200, aDays: 20, bDays: 2 };
    expect(thinNote(p, 'this year', 'in 2025')).toBe('only 2 days with figures in 2025, against 20 this year');
    expect(thinNote(p, 'in September', 'in August', true)).toBeNull();
    expect(thinNote({ ...p, bDays: 15 }, 'this year', 'in 2025')).toBeNull();
    expect(month.bBreak).toBe(true);
    expect(week.bBreak).toBe(false);
  });

  it('puts changes in plain words', () => {
    expect(changeText(0.45, 'the week before')).toBe('45% more than the week before');
    expect(changeText(-0.12, 'August')).toBe('12% fewer than August');
    expect(changeText(-0.02, 'August')).toBe('about the same as August (2% fewer)');
    expect(changeText(0, 'the week before')).toBe('the same as the week before');
  });
});
