<script lang="ts">
  // One row per measure: the latest full week and month and the year so far, each with its
  // change on the period before. Fixed periods: the chart dates never change them. Rows with
  // a page open it.
  import { fmtInt, fmtPct } from '../lib/format';
  import { changeTone, highlight, highlightPeriods, thinNote, type Highlight, type HighlightRow } from '../lib/highlights';
  import { app } from '../lib/state.svelte';
  import { basisNote } from '../lib/teaching';
  import Icon from './Icon.svelte';

  let { rows, heading, notes = true }: { rows: HighlightRow[]; heading?: string; notes?: boolean } = $props();

  type Row = HighlightRow & { cells: Highlight[] };
  const TONE = { up: 'good', down: 'crit', same: 'neutral' } as const;

  const ds = $derived(app.data!);
  const periods = $derived(highlightPeriods(ds));
  const table = $derived(rows.map((r): Row => ({ ...r, cells: periods.map((p) => highlight(ds, r.metrics, p)) })));
  const footnotes = $derived([
    ...(notes ? periods.flatMap((p) => p.notes) : []),
    ...table.flatMap((r) => r.cells.map((c, i) => thinNote(c, periods[i].inA, periods[i].inB, periods[i].bBreak)).filter((n) => n !== null).map((n) => `${r.label}: ${n}.`)),
    ...(table.some((r) => r.cells.some((c) => c.basis === 'classroom')) ? [basisNote('classroom')] : []),
  ]);

  function open(r: Row) {
    if (!r.page) return;
    app.page = r.page;
    window.scrollTo({ top: 0 });
  }
</script>

{#snippet cells(r: Row)}
  <span class="label" class:indent={r.indent}>{r.label}</span>
  {#each r.cells as c, i (i)}
    <span class="cell">
      <span class="when">{periods[i].title}</span>
      <span class="value num">{fmtInt(c.a)}</span>
      {#if c.basis === 'new'}
        <span class="badge neutral">new measure</span>
      {:else if c.change !== null}
        <span class="badge {TONE[changeTone(c.change)]}">{fmtPct(c.change)}</span>
      {:else if c.a !== null}
        <span class="badge neutral wrap">no figures for {periods[i].vsShort}</span>
      {/if}
    </span>
  {/each}
{/snippet}

<div class="card scorecard">
  {#if heading}<h3>{heading}</h3>{/if}
  <div class="head" aria-hidden="true">
    <span></span>
    {#each periods as p (p.id)}
      <span><strong>{p.title}</strong><small>{p.when}</small><small>vs {p.vs}</small></span>
    {/each}
    <span></span>
  </div>
  {#each table as r (r.label)}
    {#if r.page}
      <button class="row link" onclick={() => open(r)}>
        {@render cells(r)}
        <span class="go"><Icon name="chevron-right" size={18} /></span>
      </button>
    {:else}
      <div class="row">
        {@render cells(r)}
        <span></span>
      </div>
    {/if}
  {/each}
  {#if footnotes.length}
    <ul class="notes">
      {#each footnotes as n (n)}<li><Icon name="info" size={15} /><span>{n}</span></li>{/each}
    </ul>
  {/if}
</div>

<style>
  .scorecard {
    padding-top: 14px;
    padding-bottom: 14px;
  }
  h3 {
    margin-bottom: 6px;
    font-size: 15px;
  }
  .head,
  .row {
    display: grid;
    grid-template-columns: minmax(150px, 1.3fr) repeat(3, minmax(0, 1fr)) 22px;
    gap: 6px 14px;
    align-items: center;
  }
  .head {
    padding-bottom: 8px;
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.35;
  }
  .head strong {
    display: block;
    font-size: 14px;
    color: var(--ink);
  }
  .head small {
    display: block;
    font-size: 12px;
  }
  .row {
    width: 100%;
    padding: 10px 0;
    border: 0;
    border-top: 1px solid var(--rule);
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
  }
  .row.link {
    cursor: pointer;
  }
  .row.link:hover {
    background: var(--card-2);
  }
  .label {
    font-size: 15px;
    font-weight: 600;
  }
  .label.indent {
    padding-left: 14px;
    font-weight: 400;
    color: var(--ink-2);
  }
  .cell {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .value {
    font-size: 18px;
    font-weight: 700;
  }
  .badge {
    font-size: 13px;
  }
  .badge.wrap {
    white-space: normal;
    font-weight: 600;
  }
  /* Period names show in each cell on phones; on wider screens the header says them. */
  .when {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  .go {
    display: grid;
    place-items: center;
    color: var(--ink-3);
  }
  .notes {
    list-style: none;
    margin: 0;
    padding: 10px 0 0;
    border-top: 1px solid var(--rule);
    display: grid;
    gap: 6px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .notes li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .notes :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--ink-3);
  }
  @media (max-width: 640px) {
    .head {
      display: none;
    }
    .row {
      grid-template-columns: repeat(3, minmax(0, 1fr)) 18px;
      gap: 6px 8px;
    }
    .label {
      grid-column: 1 / -1;
    }
    .cell {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .when {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      clip: auto;
      white-space: normal;
      font-size: 12px;
      color: var(--ink-3);
    }
    .value {
      font-size: 17px;
    }
    .go {
      grid-row: 2;
      grid-column: 4;
    }
  }
</style>
