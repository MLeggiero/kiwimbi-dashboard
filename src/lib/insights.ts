import { CLASS_METRICS, ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID } from '../../shared/metrics';
import { dayParts, fmtDayShort, startOfWeek, startOfYear } from '../../shared/dates';
import type { MetricId } from '../../shared/types';
import type { Dataset } from './dataset';
import { fmtInt } from './format';
import { aggregate, makeBuckets, rangeStats } from './series';

export interface Insight {
  tone: 'good' | 'warn' | 'neutral';
  icon: string;
  text: string;
}

const GROUPS: { label: string; metrics: MetricId[] }[] = [
  { label: 'School meals', metrics: MEAL_SCHOOLS },
  { label: 'Library visits', metrics: ['library_visits'] },
  { label: 'Classes taught', metrics: CLASS_METRICS },
  { label: 'Program attendances', metrics: ENRICHMENT },
];

const inTerm = (ds: Dataset, day: number) => !ds.terms.length || ds.terms.some((t) => day >= t.start && day <= t.end);

/** Plain-language notes about the most recent complete week. Rule-based; no data leaves the page. */
export function weekInsights(ds: Dataset): Insight[] {
  const out: Insight[] = [];
  const week = startOfWeek(ds.today) - 7;
  const before = makeBuckets(week - 28, week - 1, 'week', []);
  for (const g of GROUPS) {
    const cur = rangeStats(ds, g.metrics, week, week + 6);
    if (!cur.coveredDays) continue;
    const prior = aggregate(ds, g.metrics, before).values.filter((v): v is number => v !== null);
    const avg = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
    let text = `${g.label}: ${fmtInt(cur.total)} in the week of ${fmtDayShort(week)}`;
    let icon = 'minus';
    if (avg && avg > 0) {
      const pct = Math.round(((cur.total - avg) / avg) * 100);
      if (Math.abs(pct) >= 3) {
        text += `, ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% on the 4-week average`;
        icon = pct > 0 ? 'arrow-up' : 'arrow-down';
      } else text += ', in line with the 4-week average';
    }
    out.push({ tone: 'neutral', icon, text: `${text}.` });
  }

  if (inTerm(ds, ds.today)) {
    const stale: string[] = [];
    for (const m of [...MEAL_SCHOOLS, 'library_visits' as MetricId]) {
      const last = ds.lastActivity[m];
      if (last !== null && ds.today - last > 14) stale.push(`${METRIC_BY_ID[m].label.toLowerCase()} (last ${fmtDayShort(last)})`);
    }
    if (stale.length) out.push({ tone: 'warn', icon: 'clock', text: `Waiting on reports for ${stale.slice(0, 3).join(', ')}.` });
  }

  for (const m of milestones(ds).slice(0, 1)) out.push({ tone: 'good', icon: 'spark', text: m.text });
  return out.slice(0, 6);
}

const THRESHOLDS: { metrics: MetricId[]; unit: string; steps: number[] }[] = [
  { metrics: MEAL_SCHOOLS, unit: 'school meals served', steps: [10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 300_000] },
  { metrics: ['books_checked_out'], unit: 'books checked out', steps: [2_500, 5_000, 10_000, 20_000, 40_000] },
  { metrics: CLASS_METRICS, unit: 'mentorship classes taught', steps: [500, 1_000, 2_000, 5_000, 10_000] },
];

/** Round-number milestones crossed so far this year (highest per metric). */
export function milestones(ds: Dataset): { key: string; text: string }[] {
  const yearStart = startOfYear(ds.today);
  const from = Math.max(yearStart, ds.firstDay);
  const year = dayParts(ds.today).y;
  const when = from > yearStart ? `since ${fmtDayShort(from)}` : `so far in ${year}`;
  const out: { key: string; text: string }[] = [];
  for (const t of THRESHOLDS) {
    const total = rangeStats(ds, t.metrics, from, ds.today).total;
    const hit = [...t.steps].reverse().find((s) => total >= s);
    if (hit) out.push({ key: `${year}-${t.unit}-${hit}`, text: `Over ${fmtInt(hit)} ${t.unit} ${when}.` });
  }
  return out;
}
