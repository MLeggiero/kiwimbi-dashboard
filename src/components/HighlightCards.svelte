<script lang="ts">
  // The page's main measure in words: the latest full week and month and the year so far,
  // each against the period before, with school breaks explained beside the change.
  import type { SeriesKey } from '../lib/dataset';
  import { fmtInt } from '../lib/format';
  import { changeText, changeTone, highlight, highlightPeriods, thinNote } from '../lib/highlights';
  import { app } from '../lib/state.svelte';
  import { basisNote } from '../lib/teaching';
  import Icon from './Icon.svelte';

  let { metrics, unit }: { metrics: SeriesKey[]; unit: string } = $props();

  const ICON = { up: 'arrow-up', down: 'arrow-down', same: 'minus' } as const;
  const ds = $derived(app.data!);
  const cards = $derived(
    highlightPeriods(ds).map((p) => {
      const h = highlight(ds, metrics, p);
      const thin = thinNote(h, p.inA, p.inB, p.bBreak);
      return { p, h, notes: [...p.notes, ...(thin ? [`${thin[0].toUpperCase()}${thin.slice(1)}.`] : []), ...(h.basis === 'classroom' ? [basisNote('classroom')] : [])] };
    }),
  );
</script>

<div class="cards">
  {#each cards as { p, h, notes } (p.id)}
    {@const tone = h.change === null ? null : changeTone(h.change)}
    <section class="card hcard" aria-label="{p.title}: {unit}">
      <p class="when"><strong>{p.title}</strong> · {p.when}</p>
      <p class="value"><span class="num">{fmtInt(h.a)}</span> <span class="unit">{unit}</span></p>
      {#if h.basis === 'new'}
        <p class="change">A new measure, so there's nothing to compare it with yet.</p>
      {:else if h.change !== null && tone}
        <p class="change {tone}"><Icon name={ICON[tone]} size={16} /><span>{changeText(h.change, p.vs)}</span></p>
      {:else if h.a !== null}
        <p class="change">No figures for {p.vs} to compare with.</p>
      {:else}
        <p class="change">None recorded.</p>
      {/if}
      {#if h.perSchoolDay !== null}<p class="sub">About {fmtInt(h.perSchoolDay)} a school day.</p>{/if}
      {#each notes as n (n)}
        <p class="note"><Icon name="info" size={15} /><span>{n}</span></p>
      {/each}
    </section>
  {/each}
</div>

<style>
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
    gap: 16px;
  }
  .hcard {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hcard p {
    margin: 0;
  }
  .when {
    font-size: 14px;
    color: var(--ink-3);
  }
  .when strong {
    color: var(--ink-2);
  }
  .value {
    line-height: 1.15;
  }
  .value .num {
    font-size: 32px;
    font-weight: 700;
  }
  .unit {
    font-size: 15px;
    color: var(--ink-2);
  }
  .change {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .change :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .change.up {
    color: var(--good);
  }
  .change.down {
    color: var(--crit);
  }
  .sub {
    font-size: 14px;
    color: var(--ink-3);
  }
  .hcard .note {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--rule);
    font-size: 14px;
    color: var(--ink-2);
  }
  .note :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--ink-3);
  }
</style>
