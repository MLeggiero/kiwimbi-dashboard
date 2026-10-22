<script lang="ts">
  // A grid of rows × periods: filled dots where something was reported ('presence'), or
  // cells shaded by amount ('intensity'). Used for reporting, mentors and programs.
  import { fmtInt } from '../lib/format';
  import type { Bucket } from '../lib/series';

  interface Props {
    columns: Bucket[];
    rows: { label: string; cells: (number | null)[]; note?: string }[];
    mode?: 'presence' | 'intensity';
    color?: string;
    unit?: string;
    /** Screen-reader description. */
    label: string;
  }
  let { columns, rows, mode = 'presence', color = 'var(--leaf)', unit = '', label }: Props = $props();

  /** Month (or term) names above the first column of each; hover a cell for its exact dates. */
  const heads = $derived.by(() => {
    let prev = '';
    return columns.map((c) => {
      const m = c.label.replace(/\s\d+$/, '');
      if (m === prev) return '';
      prev = m;
      return m;
    });
  });
  const shade = (v: number | null, max: number) => (v === null || v <= 0 || max <= 0 ? undefined : `color-mix(in srgb, ${color} ${Math.round(18 + (v / max) * 82)}%, transparent)`);
</script>

<div class="dg" role="img" aria-label={label} style:--cols={columns.length}>
  <div class="corner"></div>
  {#each heads as h, i (i)}<div class="head" title={columns[i].title}>{h}</div>{/each}
  <div class="corner"></div>
  {#each rows as r (r.label)}
    {@const max = Math.max(0, ...r.cells.map((v) => v ?? 0))}
    <div class="name" title={r.label}>{r.label}</div>
    {#each r.cells as v, i (i)}
      {#if mode === 'presence'}
        <div class="cell" title="{r.label}, {columns[i].title}: {v === null ? 'no reports' : `${fmtInt(v)} ${unit}`}">
          <span class="dot" class:on={v !== null && v > 0} class:zero={v === 0} style:--c={color}></span>
        </div>
      {:else}
        <div class="cell box" class:none={v === null} style:background={shade(v, max)} title="{r.label}, {columns[i].title}: {v === null ? 'no reports' : `${fmtInt(v)} ${unit}`}"></div>
      {/if}
    {/each}
    <div class="note">{r.note ?? ''}</div>
  {/each}
</div>

<style>
  .dg {
    display: grid;
    grid-template-columns: minmax(120px, 170px) repeat(var(--cols), minmax(10px, 1fr)) auto;
    align-items: center;
    gap: 3px 3px;
    margin-top: 10px;
    font-size: 12px;
    overflow-x: auto;
  }
  .head {
    font-size: 11px;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: visible;
  }
  .name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 8px;
  }
  .note {
    padding-left: 8px;
    color: var(--ink-3);
    white-space: nowrap;
    font-size: 11px;
  }
  .cell {
    display: grid;
    place-items: center;
    height: 18px;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 1.5px solid var(--rule-strong);
  }
  .dot.on {
    background: var(--c);
    border-color: var(--c);
  }
  .dot.zero {
    border-color: var(--c);
  }
  .box {
    border-radius: 3px;
    background: var(--card-2);
  }
  .box.none {
    background: repeating-linear-gradient(45deg, transparent 0 3px, var(--rule) 3px 4px);
  }
</style>
