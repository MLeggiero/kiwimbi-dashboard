<script lang="ts">
  // Columns per week (or month) for the printed report, drawn as SVG so they stay sharp in
  // a PDF and print in color whatever the browser's "background graphics" setting.
  import { fmtCompact, fmtInt } from '../lib/format';

  interface Series {
    name: string;
    color: string;
    values: (number | null)[];
  }
  interface Props {
    series: Series[];
    /** One label per column; empty strings are left blank. */
    labels: string[];
    /** Singular noun for the average line: "week" or "month". */
    period: string;
    label: string;
    height?: number;
  }
  let { series, labels, period, label, height = 150 }: Props = $props();

  const W = 680;
  const LEFT = 36;
  const BOTTOM = 18;
  const TOP = 16;
  const n = $derived(labels.length);
  const totals = $derived(labels.map((_, i) => (series.some((s) => s.values[i] !== null) ? series.reduce((a, s) => a + (s.values[i] ?? 0), 0) : null)));
  const reported = $derived(totals.filter((v): v is number => v !== null));
  const avg = $derived(reported.length ? reported.reduce((a, b) => a + b, 0) / reported.length : null);
  /** A round top for the scale, just above the tallest column. */
  const top = $derived.by(() => {
    const m = Math.max(1, ...reported);
    const mag = 10 ** Math.floor(Math.log10(m));
    return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((s) => s * mag).find((v) => v >= m) ?? 10 * mag;
  });
  const plotH = $derived(height - TOP - BOTTOM);
  const step = $derived((W - LEFT) / Math.max(1, n));
  const barW = $derived(Math.max(2, Math.min(22, step * 0.68)));
  const y = (v: number) => TOP + plotH - (v / top) * plotH;
  const stacks = $derived(
    labels.map((_, i) => {
      let base = 0;
      return series.map((s) => {
        const v = s.values[i] ?? 0;
        const seg = { y: y(base + v), h: (v / top) * plotH, color: s.color };
        base += v;
        return seg;
      });
    }),
  );
</script>

<svg viewBox="0 0 {W} {height}" width="100%" role="img" aria-label={label} class="bars">
  {#each [0, top / 2, top] as t (t)}
    <line x1={LEFT} x2={W} y1={y(t)} y2={y(t)} stroke="#e4ded0" stroke-width="1" />
    <text x={LEFT - 6} y={y(t) + 3} text-anchor="end" class="tick">{fmtCompact(t)}</text>
  {/each}
  {#each stacks as segs, i (i)}
    {#if totals[i] !== null}
      {#each segs as s, k (k)}
        {#if s.h > 0}<rect x={LEFT + i * step + (step - barW) / 2} y={s.y} width={barW} height={s.h} fill={s.color} />{/if}
      {/each}
    {/if}
    {#if labels[i]}<text x={LEFT + i * step + step / 2} y={height - 4} text-anchor="middle" class="tick">{labels[i]}</text>{/if}
  {/each}
  {#if avg !== null}
    <line x1={LEFT} x2={W} y1={y(avg)} y2={y(avg)} stroke="#1c2420" stroke-width="1" stroke-dasharray="4 3" />
    <text x={LEFT + 4} y={y(avg) - 4} class="avg">Average {period}: {fmtInt(avg)}</text>
  {/if}
</svg>

<style>
  .bars {
    display: block;
  }
  .tick {
    font-size: 9px;
    fill: #5f6963;
  }
  .avg {
    font-size: 10px;
    font-weight: 700;
    fill: #1c2420;
    paint-order: stroke;
    stroke: #ffffff;
    stroke-width: 3px;
  }
</style>
