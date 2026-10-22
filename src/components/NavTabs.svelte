<script lang="ts">
  import { app, PAGES } from '../lib/state.svelte';
  import Icon from './Icon.svelte';
</script>

<nav class="tabs no-print" aria-label="Dashboard pages">
  {#each PAGES as p (p.id)}
    <button class="tab" aria-current={app.page === p.id ? 'page' : undefined} onclick={() => (app.page = p.id)}>
      <Icon name={p.icon} size={16} />{p.label}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 4px;
    margin: 0 -4px 12px;
    scrollbar-width: none;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    padding: 8px 14px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
  }
  .tab:hover {
    background: var(--card);
    border-color: var(--rule);
  }
  .tab[aria-current='page'] {
    background: var(--leaf);
    color: #1f2a2e;
    font-weight: 700;
  }
</style>
