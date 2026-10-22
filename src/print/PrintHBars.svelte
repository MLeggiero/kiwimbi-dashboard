<script lang="ts">
  // Labelled horizontal bars for the printed report (schools, programs), drawn as SVG.
  import { fmtInt } from '../lib/format';

  interface Row {
    label: string;
    value: number;
    note?: string;
    color: string;
  }
  let { rows, label }: { rows: Row[]; label: string } = $props();

  const W = 680;
  const LABEL = 130;
  const ROW = 22;
  const VALUE = 200;
  const max = $derived(Math.max(1, ...rows.map((r) => r.value)));
  const barMax = W - LABEL - VALUE;
</script>

<svg viewBox="0 0 {W} {rows.length * ROW + 4}" width="100%" role="img" aria-label={label} class="hbars">
  {#each rows as r, i (r.label)}
    <text x={LABEL - 8} y={i * ROW + 15} text-anchor="end" class="name">{r.label}</text>
    <rect x={LABEL} y={i * ROW + 5} width={Math.max(r.value > 0 ? 2 : 0, (r.value / max) * barMax)} height="13" fill={r.color} />
    <text x={LABEL + (r.value / max) * barMax + 6} y={i * ROW + 15} class="val">{fmtInt(r.value)}{#if r.note}<tspan class="note" dx="8">{r.note}</tspan>{/if}</text>
  {/each}
</svg>

<style>
  .hbars {
    display: block;
  }
  .name {
    font-size: 11px;
    font-weight: 600;
    fill: #1c2420;
  }
  .val {
    font-size: 11px;
    font-weight: 700;
    fill: #1c2420;
  }
  .note {
    font-weight: 400;
    fill: #5f6963;
  }
</style>
