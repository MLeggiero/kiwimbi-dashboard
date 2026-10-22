<script lang="ts">
  // Mentorship classes. There are no per-mentor figures: class reports come in through one
  // person for now, so who submitted says nothing about who taught.
  import { fmtDayShort } from '../../shared/dates';
  import { CLASS_METRICS } from '../../shared/metrics';
  import { buildButterfly } from '../charts/butterfly';
  import { buildTimeSeries } from '../charts/timeseries';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import StatTile from '../components/StatTile.svelte';
  import { currentView, deltaLabel, kpi, periodWord, raceView, targetFor } from '../lib/current.svelte';
  import type { ECharts } from '../lib/echarts';
  import { fmtInt, fmtOne } from '../lib/format';
  import { periodNoun, raceTakeaway, typicalPeriod } from '../lib/manager';
  import { rangeStats } from '../lib/series';

  const ctx = $derived.by(currentView);
  const all = $derived(kpi(ctx, CLASS_METRICS));
  const primary = $derived(kpi(ctx, ['classes_primary']));
  const secondary = $derived(kpi(ctx, ['classes_secondary']));
  const perWeek = $derived.by(() => {
    const st = rangeStats(ctx.ds, CLASS_METRICS, ctx.from, ctx.to);
    return st.coveredWeekdays ? st.total / (st.coveredWeekdays / 5) : null;
  });
  const primaryShare = $derived(all.value ? (primary.value ?? 0) / all.value : null);

  const typical = $derived(typicalPeriod(ctx, CLASS_METRICS));
  const butterflyTitle = $derived(
    typical === null ? 'Classes taught' : `About ${fmtInt(typical)} classes in a typical ${periodNoun(ctx)}${primaryShare !== null ? `; ${Math.round(primaryShare * 100)}% in primary schools` : ''}`,
  );
  const butterfly = $derived(buildButterfly(ctx));

  const raceCtx = $derived(raceView(ctx));
  const target = $derived(targetFor(ctx, 'mentorship'));
  const race = $derived(buildTimeSeries({ ctx: raceCtx, title: 'Classes this year vs last year', series: [{ name: 'Classes', color: ctx.theme.series[0], metrics: CLASS_METRICS }], unit: 'classes', activeDays: 'weekdays', target }));

  let mainChart = $state.raw<ECharts | null>(null);
</script>

<div class="grid kpis">
  <StatTile label="Classes taught" value={all.value} delta={all.delta} deltaLabel={deltaLabel(ctx)} spark={all.spark} />
  <StatTile label="Primary" value={primary.value} delta={primary.delta} deltaLabel={deltaLabel(ctx)} spark={primary.spark} color={ctx.theme.series[0]} />
  <StatTile label="Secondary" value={secondary.value} delta={secondary.delta} deltaLabel={deltaLabel(ctx)} spark={secondary.spark} color={ctx.theme.series[1]} />
  <StatTile label="Classes per school week" value={perWeek} format={fmtOne} sub="Five weekdays with reports" color="var(--ink-3)" />
</div>

<div style="margin-top:16px">
  <ChartCard title={butterflyTitle} subtitle="Classes per {periodWord(ctx)}: primary above the line, secondary below" legend={butterfly.legend} table={butterfly.table} empty={butterfly.empty} chart={mainChart}>
    <EChart option={butterfly.option} height={280} label={butterfly.summary} onready={(c) => (mainChart = c)} />
  </ChartCard>
</div>

<div style="margin-top:16px">
  <ChartCard title={raceTakeaway(raceCtx, CLASS_METRICS, 'classes', target)} subtitle="Running total of classes from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}" legend={race.legend} table={race.table} empty={race.empty}>
    <EChart option={race.option} height={240} label={race.summary} />
  </ChartCard>
</div>
