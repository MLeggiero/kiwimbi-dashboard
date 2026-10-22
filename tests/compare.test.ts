import { describe, expect, it } from 'vitest';
import { isoToDay } from '../shared/dates';
import type { PublicFact, PublicPayload } from '../shared/types';
import { baselineRange, compareMetrics, focusRange, lengthText, makeComparison } from '../src/lib/compare';
import { buildDataset } from '../src/lib/dataset';
import { storyOffersYtd, storyPresets } from '../src/lib/presets';

const d = isoToDay;

function payload(facts: PublicFact[], today = '2026-10-16'): PublicPayload {
  return {
    version: 1,
    generatedAt: `${today}T07:00:00Z`,
    today,
    timezone: 'Africa/Nairobi',
    latestSubmission: today,
    facts,
    mentors: { week: {}, month: {}, term: {}, range: {} },
    terms: [],
    targets: [],
    quality: null,
    viewer: { email: 'x@example.org', isManager: true },
  } as PublicPayload;
}

/** One meals report per school week (Mon–Fri) from `from` to `to`, `v` meals each. */
function weekly(from: string, to: string, v: number): PublicFact[] {
  const out: PublicFact[] = [];
  for (let s = d(from); s <= d(to); s += 7) {
    const iso = (x: number) => new Date(x * 86_400_000).toISOString().slice(0, 10);
    out.push({ m: 'meals_kidek', s: iso(s), e: iso(s + 4), v, t: iso(s + 5) });
  }
  return out;
}

describe('comparison periods', () => {
  const ds = buildDataset(payload(weekly('2026-01-05', '2026-10-12', 500)));
  const view: [number, number] = [d('2026-01-01'), d('2026-10-16')];

  it('uses the chart dates as A by default', () => {
    const c = makeComparison({ mode: 'prev', focus: 'range' }, ds, view, 'week')!;
    expect(c.whole).toBe(true);
    expect([c.a.from, c.a.to]).toEqual(view);
  });

  it('lets A be a short stretch inside a long chart, with B just before it', () => {
    const c = makeComparison({ mode: 'prev', focus: 'last4w' }, ds, view, 'month')!;
    expect(c.whole).toBe(false);
    expect([c.a.from, c.a.to]).toEqual([d('2026-09-19'), d('2026-10-16')]);
    expect([c.b.from, c.b.to]).toEqual([d('2026-08-22'), d('2026-09-18')]);
    expect(c.sameLength).toBe(true);
  });

  it('goes back 52 weeks for whole weeks and to the same dates otherwise', () => {
    expect(baselineRange('yoy', [d('2026-09-07'), d('2026-09-20')], false, 'week')).toEqual([d('2025-09-08'), d('2025-09-21')]);
    expect(baselineRange('yoy', [d('2026-09-01'), d('2026-09-30')], false, 'week')).toEqual([d('2025-09-01'), d('2025-09-30')]);
  });

  it('takes custom dates for A and B, and falls back to the chart dates', () => {
    expect(focusRange('custom', ds, view, [d('2026-03-02'), d('2026-03-08')])).toEqual([d('2026-03-02'), d('2026-03-08')]);
    expect(focusRange('custom', ds, view, null)).toEqual(view);
    const c = makeComparison({ mode: 'custom', focus: 'custom', a: [d('2026-09-07'), d('2026-09-13')], b: [d('2026-06-01'), d('2026-06-28')] }, ds, view, 'week')!;
    expect(c.a.days).toBe(7);
    expect(c.b.days).toBe(28);
    expect(c.sameLength).toBe(false);
  });

  it('compares totals for equal lengths and daily averages otherwise', () => {
    const same = makeComparison({ mode: 'custom', focus: 'custom', a: [d('2026-09-07'), d('2026-09-13')], b: [d('2026-06-01'), d('2026-06-07')] }, ds, view, 'week')!;
    expect(compareMetrics(ds, ['meals_kidek'], same).change).toBeCloseTo(0);
    // One steady week against four steady weeks: the same pace, so no change per day.
    const diff = makeComparison({ mode: 'custom', focus: 'custom', a: [d('2026-09-07'), d('2026-09-13')], b: [d('2026-06-01'), d('2026-06-28')] }, ds, view, 'week')!;
    const m = compareMetrics(ds, ['meals_kidek'], diff);
    expect(m.a.total).toBeCloseTo(500);
    expect(m.b.total).toBeCloseTo(2000);
    expect(m.aRate).toBeCloseTo(100);
    expect(m.change).toBeCloseTo(0);
  });

  it('declines to compare when B has too few reports', () => {
    const c = makeComparison({ mode: 'custom', focus: 'custom', a: [d('2026-09-07'), d('2026-09-13')], b: [d('2025-06-01'), d('2025-06-28')] }, ds, view, 'week')!;
    expect(compareMetrics(ds, ['meals_kidek'], c).change).toBeNull();
  });

  it('describes lengths plainly', () => {
    expect(lengthText(28)).toBe('4 weeks');
    expect(lengthText(7)).toBe('7 days');
    expect(lengthText(1)).toBe('1 day');
  });
});

describe('story quick ranges', () => {
  it('greys out YTD while reports start partway through the year, and offers "since" instead', () => {
    const ds = buildDataset(payload(weekly('2026-07-27', '2026-10-12', 500)));
    expect(storyOffersYtd(ds)).toBe(false);
    expect(storyPresets(ds)).toContain('all');
  });

  it('offers YTD once reports reach back to January 1', () => {
    const ds = buildDataset(payload(weekly('2025-09-01', '2026-10-12', 500)));
    expect(storyOffersYtd(ds)).toBe(true);
  });
});
