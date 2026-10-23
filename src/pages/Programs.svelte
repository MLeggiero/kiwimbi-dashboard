<script lang="ts">
  import { buildProgramBars } from '../charts/manager';
  import ChartCard from '../components/ChartCard.svelte';
  import DotGrid from '../components/DotGrid.svelte';
  import EChart from '../components/EChart.svelte';
  import { currentView, periodWord, rangeText } from '../lib/current.svelte';
  import { programRows, programsTakeaway, reachTakeaway } from '../lib/manager';

  const ctx = $derived.by(currentView);
  const rows = $derived(programRows(ctx));
  const running = $derived(rows.filter((r) => r.total > 0).length);
  const colors = $derived([...ctx.theme.series, ctx.theme.ink3]);
  const bars = $derived(buildProgramBars(rows, colors, ctx.theme));
</script>

<ChartCard title={programsTakeaway(rows, ctx.buckets.length, periodWord(ctx))} subtitle="When each program ran: each cell is a {periodWord(ctx)}, darker means more attendances. Hatched = nothing recorded." empty={running === 0}>
  <DotGrid columns={ctx.buckets} rows={rows.map((r) => ({ label: r.label, cells: r.cells, note: `${r.active} of ${ctx.buckets.length}` }))} mode="intensity" color={ctx.theme.series[4]} unit="attendances" label="Program attendances per {periodWord(ctx)}" />
</ChartCard>

<div style="margin-top:16px">
  <ChartCard title={reachTakeaway(rows)} subtitle="Total attendances in {rangeText(ctx)}, with how many students take part in a typical week. An attendance is one student at one session." empty={bars.empty}>
    <EChart option={bars.option} height={bars.height} label={bars.summary} />
  </ChartCard>
</div>
