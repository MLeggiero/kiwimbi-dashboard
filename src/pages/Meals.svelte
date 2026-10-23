<script lang="ts">
  import { fmtDayShort } from '../../shared/dates';
  import { MEAL_SCHOOLS, METRIC_BY_ID, STAFF_MEALS } from '../../shared/metrics';
  import { buildSchoolBars } from '../charts/manager';
  import { buildTimeSeries } from '../charts/timeseries';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import { currentView, periodWord, raceView, rangeText, targetFor } from '../lib/current.svelte';
  import type { ECharts } from '../lib/echarts';
  import { fmtInt } from '../lib/format';
  import { periodNoun, raceTakeaway, schoolRows, schoolsTakeaway, typicalPeriod } from '../lib/manager';
  import { rangeStats } from '../lib/series';

  // The meals count is the three partner schools. Staff and tailoring meals are shown
  // separately and never added to it.
  const ctx = $derived.by(currentView);
  const sites = $derived(MEAL_SCHOOLS.map((id, i) => ({ id, label: METRIC_BY_ID[id].short, color: ctx.theme.series[i] })));
  const total = $derived(rangeStats(ctx.ds, MEAL_SCHOOLS, ctx.from, ctx.to).total);

  const typical = $derived(typicalPeriod(ctx, MEAL_SCHOOLS));
  const mainTitle = $derived(
    ctx.view === 'cumulative' ? `${fmtInt(total)} school meals in ${rangeText(ctx)}` : typical === null ? 'School meals by school' : `About ${fmtInt(typical)} school meals in a typical ${periodNoun(ctx)}`,
  );
  const main = $derived(buildTimeSeries({ ctx, title: mainTitle, series: sites.map((s) => ({ name: s.label, color: s.color, metrics: [s.id] })), unit: 'meals', activeDays: 'weekdays', target: targetFor(ctx, 'meals') }));

  const schools = $derived(schoolRows(ctx));
  const schoolChart = $derived(buildSchoolBars(schools, sites.map((s) => s.color), ctx.theme));

  const raceCtx = $derived(raceView(ctx));
  const target = $derived(targetFor(ctx, 'meals'));
  const race = $derived(buildTimeSeries({ ctx: raceCtx, title: 'School meals this year vs last year', series: [{ name: 'School meals', color: ctx.theme.series[0], metrics: MEAL_SCHOOLS }], unit: 'meals', activeDays: 'weekdays', target }));

  const staffChart = $derived(buildTimeSeries({ ctx, title: 'Staff & tailoring meals', series: [{ name: 'Staff & tailoring', color: ctx.theme.series[5], metrics: STAFF_MEALS }], unit: 'meals', activeDays: 'weekdays' }));
  const staffTypical = $derived(typicalPeriod(ctx, STAFF_MEALS));

  let mainChart = $state.raw<ECharts | null>(null);
  let raceChart = $state.raw<ECharts | null>(null);
  let staffRef = $state.raw<ECharts | null>(null);
</script>

<ChartCard title={mainTitle} subtitle="School meals per {periodWord(ctx)}, stacked by school, with the 4-week average. Reports that cover several weeks are spread across them." legend={main.legend} table={main.table} empty={main.empty} chart={mainChart}>
  <EChart option={main.option} height={320} label={main.summary} onready={(c) => (mainChart = c)} />
</ChartCard>

<div class="grid two" style="margin-top:16px">
  <ChartCard title={schoolsTakeaway(schools)} subtitle={schoolChart.mode === 'change' ? `Change on the same weeks last year, and meals per school day, ${rangeText(ctx)}` : `Meals per school day with a report, ${rangeText(ctx)}`} empty={schoolChart.empty}>
    <EChart option={schoolChart.option} height={schoolChart.height} label={schoolChart.summary} />
  </ChartCard>
  <ChartCard title={raceTakeaway(raceCtx, MEAL_SCHOOLS, 'meals', target)} subtitle="Always this year: running total from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}{target ? ' and the year’s target pace' : ''}" legend={race.legend} table={race.table} empty={race.empty} chart={raceChart}>
    <EChart option={race.option} height={260} label={race.summary} onready={(c) => (raceChart = c)} />
  </ChartCard>
</div>

<div style="margin-top:16px">
  <ChartCard title={staffTypical === null ? 'Staff & tailoring meals' : `About ${fmtInt(staffTypical)} staff & tailoring meals in a typical ${periodNoun(ctx)}`} subtitle="Meals for staff and tailoring students: shown here for reference, never added to the meals count" legend={staffChart.legend} table={staffChart.table} empty={staffChart.empty} chart={staffRef}>
    <EChart option={staffChart.option} height={200} label={staffChart.summary} onready={(c) => (staffRef = c)} />
  </ChartCard>
</div>
