<script lang="ts">
  // Teaching & Mentoring: summed contact hours, classroom and mentorship, by school and level.
  // Each school's total comes from one reporter, so there are no per-mentor figures. Weeks
  // before contact hours were reported are classroom hours estimated from lesson counts
  // (40 minutes a lesson).
  import { fmtDayShort } from '../../shared/dates';
  import { TEACHING_METRICS } from '../../shared/metrics';
  import { buildTeachingChart, type TeachingSplit } from '../charts/butterfly';
  import { buildTimeSeries } from '../charts/timeseries';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import StatTile from '../components/StatTile.svelte';
  import { currentView, deltaLabel, kpi, periodWord, raceView, targetFor } from '../lib/current.svelte';
  import { reportedKey } from '../lib/dataset';
  import type { ECharts } from '../lib/echarts';
  import { fmtInt } from '../lib/format';
  import { periodNoun, raceTakeaway, typicalPeriod } from '../lib/manager';
  import { rangeStats } from '../lib/series';
  import { EST_CLASSROOM } from '../lib/teaching';

  const ctx = $derived.by(currentView);
  const all = $derived(kpi(ctx, TEACHING_METRICS));
  const classroom = $derived(kpi(ctx, ['contact_classroom']));
  const mentorship = $derived(kpi(ctx, ['contact_mentorship']));
  const estimated = $derived(rangeStats(ctx.ds, [EST_CLASSROOM], ctx.from, ctx.to));
  const estNote = $derived(estimated.coveredDays ? `Includes ${fmtInt(estimated.total)} estimated from lesson counts` : undefined);

  // The classroom share uses hours reported as hours: estimated weeks have no mentorship.
  const classroomShare = $derived.by(() => {
    const c = rangeStats(ctx.ds, [reportedKey('contact_classroom')], ctx.from, ctx.to).total;
    const m = rangeStats(ctx.ds, [reportedKey('contact_mentorship')], ctx.from, ctx.to).total;
    return c + m > 0 ? c / (c + m) : null;
  });
  const typical = $derived(typicalPeriod(ctx, TEACHING_METRICS));
  const title = $derived(
    typical === null ? 'Contact hours' : `About ${fmtInt(typical)} contact hours in a typical ${periodNoun(ctx)}${classroomShare !== null ? `; ${Math.round(classroomShare * 100)}% classroom` : ''}`,
  );

  let split = $state<TeachingSplit>('level');
  const chart = $derived(buildTeachingChart(ctx, split));

  const raceCtx = $derived(raceView(ctx));
  const target = $derived(targetFor(ctx, 'mentorship'));
  const race = $derived(
    buildTimeSeries({
      ctx: raceCtx,
      title: 'Contact hours this year vs last year',
      series: [{ name: 'Contact hours', color: ctx.theme.series[0], metrics: TEACHING_METRICS }],
      unit: 'contact hours',
      activeDays: 'weekdays',
      target,
      estimated: [EST_CLASSROOM],
    }),
  );

  let mainChart = $state.raw<ECharts | null>(null);
  let raceChart = $state.raw<ECharts | null>(null);
</script>

<div class="grid kpis">
  <StatTile label="Contact hours" value={all.value} delta={all.delta} deltaLabel={deltaLabel(ctx)} basis={all.basis} spark={all.spark} sub={all.value === null ? 'No reports in this range' : 'Classroom and mentorship'} />
  <StatTile label="Classroom hours" value={classroom.value} delta={classroom.delta} deltaLabel={deltaLabel(ctx)} basis={classroom.basis} spark={classroom.spark} color={ctx.theme.series[0]} sub={estNote} />
  <StatTile label="Mentorship hours" value={mentorship.value} delta={mentorship.delta} deltaLabel={deltaLabel(ctx)} basis={mentorship.basis} spark={mentorship.spark} color={ctx.theme.series[4]} />
</div>

<div style="margin-top:16px">
  <ChartCard
    {title}
    subtitle="Contact hours per {periodWord(ctx)}: classroom above the line, mentorship below, by {split === 'level' ? 'level' : 'school'}. A contact hour is an hour with students, however many are there."
    legend={chart.legend}
    table={chart.table}
    empty={chart.empty}
    chart={mainChart}
  >
    {#snippet controls()}
      <div class="seg" role="group" aria-label="Split the bars by">
        <button aria-pressed={split === 'level'} onclick={() => (split = 'level')}>Level</button>
        <button aria-pressed={split === 'school'} onclick={() => (split = 'school')}>School</button>
      </div>
    {/snippet}
    <EChart option={chart.option} height={300} label={chart.summary} onready={(c) => (mainChart = c)} />
  </ChartCard>
</div>

<div style="margin-top:16px">
  <ChartCard
    title={raceTakeaway(raceCtx, TEACHING_METRICS, 'contact hours', target)}
    subtitle="Running total of contact hours from {fmtDayShort(raceCtx.from)}{race.legend.some((l) => l.kind === 'ghost') ? ', against the same weeks last year' : ''}"
    legend={race.legend}
    table={race.table}
    empty={race.empty}
    chart={raceChart}
  >
    <EChart option={race.option} height={240} label={race.summary} onready={(c) => (raceChart = c)} />
  </ChartCard>
</div>
