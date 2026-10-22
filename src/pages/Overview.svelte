<script lang="ts">
  import { CLASS_METRICS, ENRICHMENT, MEAL_SCHOOLS } from '../../shared/metrics';
  import type { MetricId } from '../../shared/types';
  import { buildCalendar, type CalendarMode } from '../charts/calendar';
  import { buildChangeBars } from '../charts/manager';
  import ChartCard from '../components/ChartCard.svelte';
  import DotGrid from '../components/DotGrid.svelte';
  import EChart from '../components/EChart.svelte';
  import Icon from '../components/Icon.svelte';
  import StatTile from '../components/StatTile.svelte';
  import WeekSummary from '../components/WeekSummary.svelte';
  import { currentView, deltaLabel, kpi, rangeText } from '../lib/current.svelte';
  import { fmtInt, fmtPct } from '../lib/format';
  import { weekInsights } from '../lib/insights';
  import { changesTakeaway, headlineChanges, reportingGrid } from '../lib/manager';
  import { app } from '../lib/state.svelte';

  const ctx = $derived.by(currentView);
  const meals = $derived(kpi(ctx, MEAL_SCHOOLS));
  const perDay = $derived(meals.stats.coveredWeekdays ? meals.stats.total / meals.stats.coveredWeekdays : null);
  const tiles = $derived([
    { label: 'Library visits', k: kpi(ctx, ['library_visits']), color: ctx.theme.series[2] },
    { label: 'Books checked out', k: kpi(ctx, ['books_checked_out']), color: ctx.theme.series[1] },
    { label: 'Mentorship classes', k: kpi(ctx, CLASS_METRICS), color: ctx.theme.series[0] },
    { label: 'Program attendances', k: kpi(ctx, ENRICHMENT), color: ctx.theme.series[4] },
  ]);
  const insights = $derived(weekInsights(ctx.ds));

  const changes = $derived(headlineChanges(ctx));
  const changeChart = $derived(buildChangeBars(changes, ctx.theme));
  const reporting = $derived(reportingGrid(ctx.ds));

  let calChoice = $state<'streams' | 'meals' | 'library' | 'classes'>('streams');
  const CAL: Record<'meals' | 'library' | 'classes', { metrics: MetricId[]; unit: string }> = {
    meals: { metrics: MEAL_SCHOOLS, unit: 'school meals' },
    library: { metrics: ['library_visits'], unit: 'library visits' },
    classes: { metrics: CLASS_METRICS, unit: 'classes' },
  };
  const calendar = $derived(buildCalendar(ctx, (calChoice === 'streams' ? 'streams' : CAL[calChoice]) as CalendarMode));
</script>

<section class="hero card">
  <div class="main">
    <div class="eyebrow"><Icon name="plate" size={15} /> School meals served · {rangeText(ctx)}</div>
    <div class="number">{fmtInt(meals.value)}</div>
    <div class="sub">
      {#if perDay}About {fmtInt(perDay)} meals on each school day with a report{:else}No meal reports in this range{/if}
      {#if deltaLabel(ctx) && meals.delta !== null}<span class="badge {meals.delta >= 0 ? 'good' : 'crit'}">{fmtPct(meals.delta)} {deltaLabel(ctx)}</span>{/if}
    </div>
  </div>
  <div class="side">
    <h2>This week at Kiwimbi</h2>
    <WeekSummary items={insights} />
  </div>
</section>

<div class="grid kpis" style="margin-top:16px">
  {#each tiles as t (t.label)}
    <StatTile label={t.label} value={t.k.value} delta={t.k.delta} deltaLabel={deltaLabel(ctx)} spark={t.k.spark} color={t.color} sub={t.k.value === null ? 'No reports in this range' : undefined} />
  {/each}
</div>

<div class="grid two" class:single={!changes.some((c) => c.change !== null)} style="margin-top:16px">
  {#if changes.some((c) => c.change !== null)}
    <ChartCard title={changesTakeaway(changes)} subtitle="Change on the same weeks last year, {rangeText(ctx)}. n/a: too few reports last year to compare.">
      <EChart option={changeChart.option} height={changeChart.height} label={changeChart.summary} />
    </ChartCard>
  {/if}
  <ChartCard title={reporting.takeaway} subtitle="Reports in each of the last 12 weeks. Filled = at least one report that week.">
    <DotGrid columns={reporting.weeks} rows={reporting.rows} label="Which programs reported in each of the last 12 weeks" unit="reported" />
  </ChartCard>
</div>

<div style="margin-top:16px">
  <ChartCard title="Year in activity" subtitle="Each square is a day. Darker means more reported activity." legend={calendar.legend} table={calendar.table} empty={calendar.empty}>
    {#snippet controls()}
      <select class="input" aria-label="What the calendar shows" bind:value={calChoice}>
        <option value="streams">Programs reporting</option>
        <option value="meals">Meals</option>
        <option value="library">Library visits</option>
        <option value="classes">Mentorship classes</option>
      </select>
    {/snippet}
    <EChart option={calendar.option} height={170} label={calendar.summary} />
  </ChartCard>
</div>

{#if app.data?.payload.quality?.flagged}
  <p class="quality muted">
    <Icon name="info" size={14} />
    {fmtInt(app.data.payload.quality.flagged)} reported values have notes (assumed dates, overlaps) and {fmtInt(app.data.payload.quality.excluded)} were left out (tests, typos, duplicates).
    <button class="linklike" onclick={() => (app.page = 'health')}>Review them in Data health</button>
  </p>
{/if}

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 28px;
    padding: 24px 26px;
    background: linear-gradient(135deg, var(--accent-wash), var(--card) 60%);
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ink-2);
    font-weight: 700;
  }
  .number {
    font-size: clamp(44px, 7vw, 64px);
    font-weight: 700;
    line-height: 1.05;
    margin: 8px 0 6px;
    letter-spacing: -0.02em;
  }
  .sub {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    color: var(--ink-2);
  }
  .side {
    border-left: 1px solid var(--rule);
    padding-left: 24px;
  }
  .grid.two.single {
    grid-template-columns: 1fr;
  }
  .quality {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 13px;
    margin-top: 16px;
  }
  .linklike {
    border: 0;
    background: none;
    color: var(--link);
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }
  @media (max-width: 800px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .side {
      border-left: 0;
      padding-left: 0;
      border-top: 1px solid var(--rule);
      padding-top: 16px;
    }
  }
</style>
