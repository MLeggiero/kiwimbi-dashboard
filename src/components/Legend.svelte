<script lang="ts">
  import type { LegendItem } from '../charts/common';
  let { items }: { items: LegendItem[] } = $props();
</script>

<ul class="legend">
  {#each items as it (it.label)}
    <li><span class="key {it.kind}" style:--c={it.color}></span>{it.label}</li>
  {/each}
</ul>

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 10px 0 6px;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--ink-2);
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .key {
    display: inline-block;
    width: 12px;
    height: 10px;
    border-radius: 3px;
    background: var(--c);
  }
  .key.line,
  .key.ghost {
    width: 16px;
    height: 2px;
    border-radius: 1px;
  }
  .key.target,
  .key.provisional {
    width: 16px;
    height: 0;
    background: none;
    border-top: 2px dashed var(--c);
  }
  .key.provisional {
    border-top-style: dotted;
  }
  .key.area {
    width: 16px;
    border-radius: 0;
    border-top: 2px solid var(--c);
    background: color-mix(in srgb, var(--c) 18%, transparent);
  }
  .key.estimated {
    border: 1px dashed var(--ink-3);
  }
  .key.span {
    width: 14px;
    height: 12px;
    border-radius: 0;
    border-inline: 1.5px dashed var(--c);
    background: color-mix(in srgb, var(--c) 16%, transparent);
  }
  .key.holiday {
    border: 1px solid var(--hairline-strong);
  }
  .key.hatch {
    background: repeating-linear-gradient(45deg, transparent 0 3px, var(--c) 3px 4px);
    border: 1px solid var(--hairline-strong);
  }
</style>
