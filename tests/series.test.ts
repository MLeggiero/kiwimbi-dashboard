import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/dataset';
import { mentorsInBucket, mentorsInRange } from '../src/lib/mentors';
import { presetRange } from '../src/lib/presets';
import { aggregate, compareRange, cumulative, holidayFlags, makeBuckets, pctChange, rangeStats, rolling } from '../src/lib/series';
import { runPipeline } from '../shared/pipeline';
import { toPublicPayload } from '../shared/payload';
import { dayToIso, isoToDay } from '../shared/dates';
import { makeFakeSheet } from '../dev/fake-sheet';
import { METRICS } from '../shared/metrics';
import type { PublicFact, PublicPayload } from '../shared/types';

const d = isoToDay;

function payload(facts: PublicFact[], terms: PublicPayload['terms'] = []): PublicPayload {
  return {
    version: 1,
    generatedAt: '2026-09-23T07:00:00Z',
    today: '2026-09-23',
    timezone: 'Africa/Nairobi',
    latestSubmission: '2026-09-22',
    facts,
    mentors: { week: {}, month: {}, term: {}, range: {} },
    terms,
    targets: [],
    quality: { rows: 0, used: facts.length, excluded: 0, flagged: 0 },
    viewer: { email: 'x@example.org', isManager: false },
  };
}

describe('spreading reports across days', () => {
  it('spreads a school report over its school days only', () => {
    const ds = buildDataset(payload([{ m: 'meals_kidek', s: '2026-09-07', e: '2026-09-13', v: 700, t: '2026-09-14' }]));
    const s = ds.daily.meals_kidek;
    const at = (iso: string) => s.values[d(iso) - ds.origin];
    expect(at('2026-09-07')).toBeCloseTo(140);
    expect(at('2026-09-11')).toBeCloseTo(140);
    expect(at('2026-09-12')).toBe(0);
    expect(s.covered[d('2026-09-12') - ds.origin]).toBe(1);
    expect(s.covered[d('2026-09-14') - ds.origin]).toBe(0);
  });

  it('falls back to all days for a weekend-only school report', () => {
    const ds = buildDataset(payload([{ m: 'meals_kidek', s: '2026-09-12', e: '2026-09-13', v: 50, t: '2026-09-14' }]));
    expect(ds.daily.meals_kidek.values[d('2026-09-12') - ds.origin]).toBeCloseTo(25);
  });

  it('turns one long catch-up report into a steady plateau instead of a spike', () => {
    const ds = buildDataset(payload([{ m: 'meals_amagoro', s: '2026-01-12', e: '2026-03-20', v: 10_000, t: '2026-03-20' }]));
    const weeks = makeBuckets(d('2026-01-12'), d('2026-03-15'), 'week', []);
    const vals = aggregate(ds, ['meals_amagoro'], weeks).values as number[];
    expect(new Set(vals.map((v) => Math.round(v))).size).toBe(1);
    expect(vals[0]).toBeCloseTo(1000);
  });

  it('never changes totals: buckets always add up to the range total', () => {
    const today = '2026-09-23';
    const opts = { today, timezone: 'Africa/Nairobi', generatedAt: '', hashName: (n: string) => n };
    const p = toPublicPayload(runPipeline(makeFakeSheet({ today }), opts), { email: '', isManager: false }, today);
    const ds = buildDataset(p);
    const ids = METRICS.map((m) => m.id);
    const allFrom = d('2024-06-01');
    const allTo = d('2026-10-31');
    const factTotal = p.facts.reduce((sum, f) => sum + f.v, 0);
    expect(rangeStats(ds, ids, allFrom, allTo).total).toBeCloseTo(factTotal, 6);
    for (const [from, to] of [['2026-01-01', '2026-09-23'], ['2025-03-17', '2025-11-02'], ['2026-02-11', '2026-02-11']]) {
      const expected = rangeStats(ds, ids, d(from), d(to)).total;
      for (const g of ['week', 'month', 'term'] as const) {
        const buckets = makeBuckets(d(from), d(to), g, ds.terms);
        const sum = aggregate(ds, ids, buckets).values.reduce<number>((a, v) => a + (v ?? 0), 0);
        expect(sum, `${from}..${to} by ${g}`).toBeCloseTo(expected, 6);
      }
    }
  });
});

describe('mentor counts from the server', () => {
  const today = '2026-09-23';
  const opts = { today, timezone: 'Africa/Nairobi', generatedAt: '', hashName: (n: string) => n };
  const ds = buildDataset(toPublicPayload(runPipeline(makeFakeSheet({ today }), opts), { email: '', isManager: false }, today));

  it('answers for preset ranges, whole weeks, whole months and terms', () => {
    const [from, to] = presetRange('ytd', ds);
    expect(mentorsInRange(ds, from, to)).toBe(ds.payload.mentors.range[`${dayToIso(from)}|${dayToIso(to)}`]);
    expect(mentorsInRange(ds, d('2026-09-07'), d('2026-09-13'))).toBe(ds.payload.mentors.week['2026-09-07']);
    expect(mentorsInRange(ds, d('2026-03-01'), d('2026-03-31'))).toBe(ds.payload.mentors.month['2026-03']);
    expect(mentorsInRange(ds, d('2026-01-05'), d('2026-04-02'))).toBe(ds.payload.mentors.term['Term 1 2026']);
  });

  it('gives no count for arbitrary ranges rather than a guess', () => {
    expect(mentorsInRange(ds, d('2026-02-03'), d('2026-05-17'))).toBeNull();
  });

  it('labels chart periods from the same counts', () => {
    const weeks = makeBuckets(d('2026-09-01'), d('2026-09-20'), 'week', ds.terms);
    expect(weeks.map((b) => mentorsInBucket(ds, b, 'week'))).toEqual(['2026-08-31', '2026-09-07', '2026-09-14'].map((w) => ds.payload.mentors.week[w] ?? 0));
    const terms = makeBuckets(d('2026-07-01'), d('2026-09-23'), 'term', ds.terms);
    expect(terms.map((b) => mentorsInBucket(ds, b, 'term'))).toEqual([ds.payload.mentors.term['Term 2 2026'] ?? 0, null, ds.payload.mentors.term['Term 3 2026'] ?? 0]);
  });
});

describe('buckets and summaries', () => {
  const ds = buildDataset(
    payload([
      { m: 'library_visits', s: '2026-08-31', e: '2026-09-04', v: 500, t: '2026-09-05' },
      { m: 'library_visits', s: '2026-09-14', e: '2026-09-18', v: 0, t: '2026-09-19' },
    ]),
  );

  it('marks weeks with no reports as null and real zeros as 0', () => {
    const weeks = makeBuckets(d('2026-08-31'), d('2026-09-20'), 'week', []);
    expect(aggregate(ds, ['library_visits'], weeks).values).toEqual([500, null, 0]);
  });

  it('clips partial weeks to the range and labels them', () => {
    const weeks = makeBuckets(d('2026-01-01'), d('2026-01-20'), 'week', []);
    expect(weeks.map((w) => [dayToIso(w.start), dayToIso(w.end), w.partial])).toEqual([
      ['2026-01-01', '2026-01-04', true],
      ['2026-01-05', '2026-01-11', false],
      ['2026-01-12', '2026-01-18', false],
      ['2026-01-19', '2026-01-20', true],
    ]);
    expect(weeks[0].label).toBe('Jan 1');
  });

  it('builds term buckets with breaks between terms', () => {
    const terms = [
      { label: 'Term 2', start: d('2026-04-27'), end: d('2026-07-31') },
      { label: 'Term 3', start: d('2026-08-24'), end: d('2026-10-30') },
    ];
    const b = makeBuckets(d('2026-07-01'), d('2026-09-23'), 'term', terms);
    expect(b.map((x) => [x.label, dayToIso(x.start), dayToIso(x.end)])).toEqual([
      ['Term 2', '2026-07-01', '2026-07-31'],
      ['Break', '2026-08-01', '2026-08-23'],
      ['Term 3', '2026-08-24', '2026-09-23'],
    ]);
    const weeks = makeBuckets(d('2026-07-27'), d('2026-08-30'), 'week', terms);
    expect(holidayFlags(weeks, terms)).toEqual([false, true, true, true, false]);
  });

  it('averages only weeks that have reports, and breaks at gaps', () => {
    expect(rolling([10, null, 20, 30, null, 40], 4)).toEqual([10, null, 15, 20, null, 30]);
    expect(cumulative([5, null, 10])).toEqual([5, 5, 15]);
  });

  it('compares like with like', () => {
    expect(compareRange(d('2026-09-07'), d('2026-09-20'), 'yoy', 'week')?.map(dayToIso)).toEqual(['2025-09-08', '2025-09-21']);
    expect(compareRange(d('2026-01-01'), d('2026-09-23'), 'yoy', 'month')?.map(dayToIso)).toEqual(['2025-01-01', '2025-09-23']);
    expect(compareRange(d('2026-09-01'), d('2026-09-10'), 'prev', 'week')?.map(dayToIso)).toEqual(['2026-08-18', '2026-08-27']);
    expect(compareRange(d('2026-09-01'), d('2026-09-10'), 'none', 'week')).toBeNull();
  });

  it('declines to compare against a period with too few reports', () => {
    const cur = { total: 100, days: 30, coveredDays: 20, coveredWeekdays: 15 };
    expect(pctChange(cur, { total: 80, days: 30, coveredDays: 20, coveredWeekdays: 15 })).toBeCloseTo(0.25);
    expect(pctChange(cur, { total: 80, days: 30, coveredDays: 5, coveredWeekdays: 5 })).toBeNull();
    expect(pctChange(cur, { total: 0, days: 30, coveredDays: 0, coveredWeekdays: 0 })).toBeNull();
  });
});
