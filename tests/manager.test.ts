import { describe, expect, it } from 'vitest';
import { buildDataset } from '../src/lib/dataset';
import {
  changesTakeaway,
  headlineChanges,
  programRows,
  programsTakeaway,
  raceTakeaway,
  reportingGrid,
  schoolRows,
  schoolsTakeaway,
  typicalPeriod,
} from '../src/lib/manager';
import { makeBuckets, rangeStats } from '../src/lib/series';
import { NO_COMPARE } from '../src/lib/compare';
import { makeViewContext } from '../src/lib/view';
import type { ChartTheme } from '../src/lib/theme.svelte';
import { runPipeline } from '../shared/pipeline';
import { toOpsPayload, toPublicPayload } from '../shared/payload';
import { isoToDay } from '../shared/dates';
import { MEAL_SCHOOLS } from '../shared/metrics';
import { makeFakeSheet } from '../dev/fake-sheet';

const today = '2026-09-23';
const opts = { today, timezone: 'Africa/Nairobi', generatedAt: '', hashName: (n: string) => `id_${n}` };
const clean = runPipeline(makeFakeSheet({ today }), opts);
const ds = buildDataset(toPublicPayload(clean, { email: 'm@example.org', isManager: true }, today));
const ops = toOpsPayload(clean);
const theme = { series: ['#1', '#2', '#3', '#4', '#5', '#6'] } as unknown as ChartTheme;
const ctx = (from: string, to: string, g: 'week' | 'month' = 'week') => makeViewContext(ds, isoToDay(from), isoToDay(to), g, 'weekly', NO_COMPARE, theme);
const ytd = ctx('2026-01-01', today);

describe('takeaway titles', () => {
  it('names the biggest movers against last year', () => {
    const rows = headlineChanges(ytd);
    expect(rows.map((r) => r.label)).toEqual(['School meals', 'Library visits', 'Books checked out', 'Contact hours', 'Program attendances']);
    expect(changesTakeaway(rows)).toMatch(/last year/);
    expect(changesTakeaway(rows.map((r) => ({ ...r, change: null })))).toBe('Not enough reports from last year to compare yet');
    expect(changesTakeaway([{ label: 'A', change: 0.1, total: 1 }, { label: 'B', change: -0.2, total: 1 }])).toBe('A up 10% on last year; b down 20%');
  });

  it('describes a typical period from complete, settled periods only', () => {
    const typical = typicalPeriod(ytd, MEAL_SCHOOLS)!;
    expect(typical).toBeGreaterThan(0);
    expect(typical).toBeLessThan(rangeStats(ds, MEAL_SCHOOLS, ytd.from, ytd.to).total);
  });

  it('compares schools on last year when it can, else by meals per school day', () => {
    const rows = schoolRows(ytd);
    expect(rows).toHaveLength(3);
    expect(schoolsTakeaway(rows)).toMatch(/Amagoro|Kidek|Ikapolok/);
    expect(schoolsTakeaway(rows.map((r) => ({ ...r, change: null })))).toMatch(/serves the most meals on a school day/);
  });

  it('says whether the running total is ahead of last year and the target pace', () => {
    const text = raceTakeaway(ytd, MEAL_SCHOOLS, 'meals', { value: 90_000, year: 2026 });
    expect(text).toMatch(/(ahead of|behind|Level with) last year/);
    expect(text).toMatch(/target pace/);
  });
});

describe('reporting grid', () => {
  it('covers the last 12 weeks for every program', () => {
    const g = reportingGrid(ds);
    expect(g.weeks).toHaveLength(12);
    for (const r of g.rows) expect(r.cells).toHaveLength(12);
    expect(g.takeaway).toMatch(/reported|no reports/);
  });
});

describe('programs', () => {
  it('sorts programs by attendances and explains when they ran', () => {
    const c = ctx('2026-01-01', today);
    const rows = programRows(c);
    expect(rows.map((r) => r.total)).toEqual([...rows.map((r) => r.total)].sort((a, b) => b - a));
    for (const r of rows) expect(r.active).toBeLessThanOrEqual(c.buckets.length);
    expect(programsTakeaway(rows, c.buckets.length, 'week')).toMatch(/ran in \d+ of \d+ weeks/);
  });
});
