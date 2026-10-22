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
  import { rangeStats } from '../lib/series';

  const ctx = $derived.by(currentView);
  const visits = $derived(kpi(ctx, ['library_visits']));
  const books = $derived(kpi(ctx, ['books_checked_out']));
  const ratio = $derived(visits.value && books.value !== null ? books.value / visits.value : null);
  const visitsPerDay = $derived.by(() => {
    const st = rangeStats(ctx.ds, ['library_visits'], ctx.from, ctx.to);
    return st.coveredWeekdays ? st.total / st.coveredWeekdays : null;
  });

  const main = $derived(
    buildTimeSeries({
      ctx,
      title: libraryTakeaway(ctx),
      series: [
        { name: 'Library visits', color: ctx.theme.series[2], metrics: ['library_visits'] },
        { name: 'Books checked out', color: ctx.theme.series[1], metrics: ['books_checked_out'] },
      ],
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
  <StatTile label="Books checked out" value={books.value} delta={books.delta} deltaLabel={deltaLabel(ctx)} spark={books.spark} color={ctx.theme.series[1]} />
  <StatTile label="Books per visit" value={ratio} format={fmtOne} sub="Books checked out ÷ visits" color={ctx.theme.series[2]} />
  <StatTile label="Visits per school day" value={visitsPerDay} format={fmtOne} sub="Weekdays with reports" color={ctx.theme.series[2]} />
</div>

<div style="margin-top:16px">
  <ChartCard title={libraryTakeaway(ctx)} subtitle="Visits and books checked out per {periodWord(ctx)}" legend={main.legend} table={main.table} empty={main.empty} chart={mainChart}>
    <EChart option={main.option} height={300} label={main.summary} onready={(c) => (mainChart = c)} />
  </ChartCard>
</div>

<div class="grid two" style="margin-top:16px">
  <ChartCard title={ratioTakeaway(ctx)} subtitle="Books checked out for every visit, per {periodWord(ctx)}: are visits turning into borrowing?" legend={ratioChart.legend} table={ratioChart.table} empty={ratioChart.empty}>
    <EChart option={ratioChart.option} height={240} label={ratioChart.summary} />
  </ChartCard>
  <ChartCard title={raceTakeaway(raceCtx, ['library_visits'], 'visits', target)} subtitle="Running total of visits from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}" legend={race.legend} table={race.table} empty={race.empty}>
    <EChart option={race.option} height={240} label={race.summary} />
  </ChartCard>
</div>
