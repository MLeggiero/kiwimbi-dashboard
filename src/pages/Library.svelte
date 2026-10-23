<script lang="ts">
  import { fmtDayShort } from '../../shared/dates';
  import { buildRatio } from '../charts/simple';
  import { buildTimeSeries } from '../charts/timeseries';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import { currentView, periodWord, raceView, targetFor } from '../lib/current.svelte';
  import type { ECharts } from '../lib/echarts';
  import { libraryTakeaway, raceTakeaway, ratioTakeaway } from '../lib/manager';
  import { bookSeries } from '../lib/library';

  const ctx = $derived.by(currentView);

  const main = $derived(
    buildTimeSeries({
      ctx,
      title: libraryTakeaway(ctx),
      series: [{ name: 'Library visits', color: ctx.theme.series[2], metrics: ['library_visits'] }, ...bookSeries(ctx, ctx.theme.series[1])],
      // Lessons are far smaller numbers: in the table and CSV, not on the chart.
      tableOnly: [{ name: 'Library lessons', color: ctx.theme.series[4], metrics: ['library_lessons'] }],
      unit: 'visits and books',
      activeDays: 'weekdays',
      grouped: ctx.view !== 'cumulative',
    }),
  );
  const ratioChart = $derived(buildRatio(ctx));
  const raceCtx = $derived(raceView(ctx));
  const target = $derived(targetFor(ctx, 'library'));
  const race = $derived(buildTimeSeries({ ctx: raceCtx, title: 'Library visits this year vs last year', series: [{ name: 'Visits', color: ctx.theme.series[2], metrics: ['library_visits'] }], unit: 'visits', activeDays: 'weekdays', target }));

  let mainChart = $state.raw<ECharts | null>(null);
</script>

<ChartCard title={libraryTakeaway(ctx)} subtitle="Visits and books checked out per {periodWord(ctx)}, books stacked by where they were borrowed. Library lessons are in the table." legend={main.legend} table={main.table} empty={main.empty} chart={mainChart}>
  <EChart option={main.option} height={300} label={main.summary} onready={(c) => (mainChart = c)} />
</ChartCard>

<div class="grid two" style="margin-top:16px">
  <ChartCard title={ratioTakeaway(ctx)} subtitle="Main-library books checked out for every visit, per {periodWord(ctx)}: are visits turning into borrowing?" legend={ratioChart.legend} table={ratioChart.table} empty={ratioChart.empty}>
    <EChart option={ratioChart.option} height={240} label={ratioChart.summary} />
  </ChartCard>
  <ChartCard title={raceTakeaway(raceCtx, ['library_visits'], 'visits', target)} subtitle="Always this year: running total of visits from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}" legend={race.legend} table={race.table} empty={race.empty}>
    <EChart option={race.option} height={240} label={race.summary} />
  </ChartCard>
</div>
