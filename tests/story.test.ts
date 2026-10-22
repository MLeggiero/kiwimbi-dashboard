import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/dataset';
import { availablePresets, presetRange } from '../src/lib/presets';
import { buildStory, storyPeriod } from '../src/lib/story';
import { isoToDay } from '../shared/dates';
import type { PublicFact } from '../shared/types';

const d = isoToDay;

function dataset(facts: PublicFact[]) {
  return buildDataset({
    version: 1,
    generatedAt: '2026-09-23T07:00:00Z',
    today: '2026-09-23',
    timezone: 'Africa/Nairobi',
    latestSubmission: '2026-09-22',
    facts,
    mentors: { week: {}, month: {}, term: {}, range: {} },
    terms: [],
    targets: [],
    quality: null,
    viewer: { email: 'x@example.org', isManager: false },
  });
}

// Two weeks of lunches in 2026 and the same two weeks in 2025 (weekdays only).
const facts: PublicFact[] = [
  { m: 'meals_amagoro', s: '2026-03-02', e: '2026-03-13', v: 3000, t: '2026-03-14' },
  { m: 'meals_kidek', s: '2026-03-02', e: '2026-03-13', v: 1000, t: '2026-03-14' },
  { m: 'meals_amagoro', s: '2025-03-03', e: '2025-03-14', v: 2000, t: '2025-03-15' },
  { m: 'meals_kidek', s: '2025-03-03', e: '2025-03-14', v: 1000, t: '2025-03-15' },
  { m: 'library_visits', s: '2026-03-02', e: '2026-03-06', v: 500, t: '2026-03-07' },
  { m: 'books_checked_out', s: '2026-03-02', e: '2026-03-06', v: 125, t: '2026-03-07' },
];

describe('story periods', () => {
  const ds = dataset(facts);

  it('words each timeline choice for headings and sentences', () => {
    const at = (p: Parameters<typeof presetRange>[0]) => storyPeriod(ds, p, ...presetRange(p, ds));
    expect(at('ytd')).toMatchObject({ label: '2026 so far', phrase: 'so far this year' });
    expect(at('lastyear')).toMatchObject({ label: '2025', phrase: 'in 2025' });
    expect(at('last3m')).toMatchObject({ label: 'The last 3 months', phrase: 'in the last 3 months' });
    expect(at('last1m')).toMatchObject({ label: 'The last month', phrase: 'in the last month' });
    expect(presetRange('last1m', ds)).toEqual([d('2026-08-24'), d('2026-09-23')]);
    expect(presetRange('last1w', ds)).toEqual([d('2026-09-17'), d('2026-09-23')]);
    expect(at('all')).toMatchObject({ label: 'Since March 3, 2025', phrase: 'since March 3, 2025' });
    expect(storyPeriod(ds, 'custom', d('2026-03-02'), d('2026-03-13')).label).toBe('Mar 2 – 13, 2026');
  });

  it('adds up the three schools only, per school day, for the selected dates only', () => {
    const s = buildStory(ds, 'custom', d('2026-03-01'), d('2026-03-14'));
    expect(s.meals.total).toBeCloseTo(4000);
    expect(s.meals.perSchoolDay).toBeCloseTo(400);
    expect(s.booksPerVisit).toBeCloseTo(0.25);
    expect(s.schools.map((x) => x.value)).toEqual([3000, 1000, 0]);
    expect(Object.keys(s.meals).sort()).toEqual(['perSchoolDay', 'total']);
  });
});

describe('when reporting starts mid-year (DATA_START)', () => {
  const late = dataset([
    { m: 'meals_amagoro', s: '2026-07-27', e: '2026-07-31', v: 900, t: '2026-08-01' },
    { m: 'meals_kidek', s: '2026-09-14', e: '2026-09-18', v: 700, t: '2026-09-19' },
  ]);

  it('never reaches back before the first report, and hides choices that would repeat or be empty', () => {
    expect(presetRange('ytd', late)).toEqual([d('2026-07-27'), d('2026-09-23')]);
    expect(availablePresets(late)).toEqual(['ytd', 'last1w', 'last1m', 'last3m']);
    const lastYear = presetRange('lastyear', late);
    expect(lastYear[1]).toBeLessThan(lastYear[0]);
  });

  it('names the start day, also for year to date', () => {
    expect(storyPeriod(late, 'all', ...presetRange('all', late))).toMatchObject({ label: 'Since July 27', phrase: 'since July 27' });
    expect(storyPeriod(late, 'ytd', ...presetRange('ytd', late))).toMatchObject({ label: '2026 so far', phrase: 'since July 27' });
  });
});
