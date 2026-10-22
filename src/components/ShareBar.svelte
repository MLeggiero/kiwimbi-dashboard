<script lang="ts">
  // Part-to-whole as one 100% bar (instead of a pie), with labels under the bar.
  import { fmtInt } from '../lib/format';

  let { parts, unit }: { parts: { label: string; value: number; color: string }[]; unit: string } = $props();
  const total = $derived(parts.reduce((a, p) => a + p.value, 0));
</script>

{#if total > 0}
  <div class="bar" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
    {#each parts as p (p.label)}
      {#if p.value > 0}<span style:flex-grow={p.value} style:background={p.color} title="{p.label}: {fmtInt(p.value)} {unit}"></span>{/if}
    {/each}
  </div>
  <ul class="labels">
    {#each parts as p (p.label)}
      <li>
        <span class="dot" style:background={p.color}></span>
        <span class="name">{p.label}</span>
        <strong class="num">{Math.round((p.value / total) * 100)}%</strong>
        <span class="muted num">{fmtInt(p.value)}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .bar {
    display: flex;
    gap: 2px;
    height: 22px;
    margin-top: 14px;
    border-radius: 6px;
    overflow: hidden;
  }
  .bar span {
    flex-basis: 0;
    min-width: 3px;
  }
  .labels {
    list-style: none;
    padding: 0;
    margin: 14px 0 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: grid;
    grid-template-columns: 12px 1fr auto 70px;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  li .muted {
    text-align: right;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
</style>
