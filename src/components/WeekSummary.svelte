<script lang="ts">
  import type { Insight } from '../lib/insights';
  import Icon from './Icon.svelte';
  let { items }: { items: Insight[] } = $props();
</script>

<ul class="insights">
  {#each items as it, i (i)}
    <li class={it.tone}>
      <span class="ic"><Icon name={it.icon} size={15} /></span>
      <span>{it.text}</span>
    </li>
  {:else}
    <li class="neutral"><span class="ic"><Icon name="clock" size={15} /></span><span>No reports yet for last week.</span></li>
  {/each}
</ul>

<style>
  .insights {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 14px;
    line-height: 1.45;
  }
  .ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--card-2);
    border: 1px solid var(--rule);
    color: var(--ink-2);
  }
  .good .ic {
    background: var(--good-bg);
    color: var(--good);
    border-color: transparent;
  }
  .warn .ic {
    background: var(--warn-bg);
    color: var(--warn);
    border-color: transparent;
  }
</style>
