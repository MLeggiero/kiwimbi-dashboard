<script lang="ts">
  import { fmtDayShort } from '../../shared/dates';
  import { buildRatio } from '../charts/simple';
  import { buildTimeSeries } from '../charts/timeseries';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import StatTile from '../components/StatTile.svelte';
  import { currentView, deltaLabel, kpi, periodWord, raceView, targetFor } from '../lib/current.svelte';
  import type { ECharts } from '../lib/echarts';
  import { fmtOne } from '../lib/format';
  import { libraryTakeaway, raceTakeaway, ratioTakeaway } from '../lib/manager';
  import { MAIN_BOOKS } from '../lib/dataset';
  import { bookSeries, booksHint } from '../lib/library';
  import { rangeStats } from '../lib/series';

  const ctx = $derived.by(currentView);
  const visits = $derived(kpi(ctx, ['library_visits']));
  const books = $derived(kpi(ctx, ['books_checked_out']));
  const lessons = $derived(kpi(ctx, ['library_lessons']));
  // Visits are counted at the main library, so books per visit uses its books (all books before the split).
  const mainBooks = $derived(rangeStats(ctx.ds, MAIN_BOOKS, ctx.from, ctx.to));
  const ratio = $derived(visits.value && mainBooks.coveredDays ? mainBooks.total / visits.value : null);

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

<div class="grid kpis">
  <StatTile label="Library visits" value={visits.value} delta={visits.delta} deltaLabel={deltaLabel(ctx)} spark={visits.spark} color={ctx.theme.series[2]} />
  <StatTile label="Books checked out" value={books.value} delta={books.delta} deltaLabel={deltaLabel(ctx)} spark={books.spark} color={ctx.theme.series[1]} sub="All locations" hint={booksHint(ctx)} />
  <StatTile label="Library lessons" value={lessons.value} delta={lessons.delta} deltaLabel={deltaLabel(ctx)} spark={lessons.spark} color={ctx.theme.series[4]} sub={lessons.value === null ? 'No reports in this range' : undefined} />
  <StatTile label="Books per visit" value={ratio} format={fmtOne} sub="Main-library books ÷ visits" color={ctx.theme.series[2]} />
</div>

<div style="margin-top:16px">
  <ChartCard title={libraryTakeaway(ctx)} subtitle="Visits and books checked out per {periodWord(ctx)}, books stacked by where they were borrowed. Library lessons are in the table." legend={main.legend} table={main.table} empty={main.empty} chart={mainChart}>
    <EChart option={main.option} height={300} label={main.summary} onready={(c) => (mainChart = c)} />
  </ChartCard>
</div>

<div class="grid two" style="margin-top:16px">
  <ChartCard title={ratioTakeaway(ctx)} subtitle="Main-library books checked out for every visit, per {periodWord(ctx)}: are visits turning into borrowing?" legend={ratioChart.legend} table={ratioChart.table} empty={ratioChart.empty}>
    <EChart option={ratioChart.option} height={240} label={ratioChart.summary} />
  </ChartCard>
  <ChartCard title={raceTakeaway(raceCtx, ['library_visits'], 'visits', target)} subtitle="Running total of visits from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}" legend={race.legend} table={race.table} empty={race.empty}>
    <EChart option={race.option} height={240} label={race.summary} />
  </ChartCard>
</div>
