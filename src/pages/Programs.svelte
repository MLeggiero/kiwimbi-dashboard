<script lang="ts">
  import { ENRICHMENT } from '../../shared/metrics';
  import { buildProgramBars } from '../charts/manager';
  import ChartCard from '../components/ChartCard.svelte';
  import DotGrid from '../components/DotGrid.svelte';
  import EChart from '../components/EChart.svelte';
  import StatTile from '../components/StatTile.svelte';
  import { currentView, deltaLabel, kpi, periodWord, rangeText } from '../lib/current.svelte';
  import { programRows, programsTakeaway, reachTakeaway } from '../lib/manager';

  const ctx = $derived.by(currentView);
  const total = $derived(kpi(ctx, ENRICHMENT));
  const workshops = $derived(kpi(ctx, ['agronomy_workshops']));
  const rows = $derived(programRows(ctx));
  const running = $derived(rows.filter((r) => r.total > 0).length);
  const colors = $derived([...ctx.theme.series, ctx.theme.ink3]);
  const bars = $derived(buildProgramBars(rows, colors, ctx.theme));
</script>

<div class="grid kpis">
  <StatTile label="Program attendances" value={total.value} delta={total.delta} deltaLabel={deltaLabel(ctx)} spark={total.spark} color={ctx.theme.series[4]} />
  <StatTile label="Programs with reports" value={running} sub="of {rows.length} in {rangeText(ctx)}" color="var(--ink-3)" />
  <StatTile label="Agronomy workshops" value={workshops.value} delta={workshops.delta} deltaLabel={deltaLabel(ctx)} spark={workshops.spark} color={ctx.theme.series[3]} />
</div>

<div style="margin-top:16px">
  <ChartCard title={programsTakeaway(rows, ctx.buckets.length, periodWord(ctx))} subtitle="When each program ran: each cell is a {periodWord(ctx)}, darker means more attendances. Hatched = no reports." empty={running === 0}>
    <DotGrid columns={ctx.buckets} rows={rows.map((r) => ({ label: r.label, cells: r.cells, note: `${r.active} of ${ctx.buckets.length}` }))} mode="intensity" color={ctx.theme.series[4]} unit="attendances" label="Program attendances per {periodWord(ctx)}" />
  </ChartCard>
</div>

<div style="margin-top:16px">
  <ChartCard title={reachTakeaway(rows)} subtitle="Total attendances in {rangeText(ctx)}, with how many students take part in a typical week. An attendance is one student at one session." empty={bars.empty}>
    <EChart option={bars.option} height={bars.height} label={bars.summary} />
  </ChartCard>
</div>
