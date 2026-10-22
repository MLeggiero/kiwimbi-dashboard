<script lang="ts">
  // Managers switch between the impact story and the dashboard. Shown in both headers.
  import { app, type Mode } from '../lib/state.svelte';

  const OPTIONS: { id: Mode; label: string }[] = [
    { id: 'story', label: 'Story' },
    { id: 'managers', label: 'Dashboard' },
  ];
</script>

{#if app.isManager}
  <div class="switch no-print" role="group" aria-label="Choose a view">
    {#each OPTIONS as o (o.id)}
      <button aria-pressed={app.mode === o.id} onclick={() => app.mode !== o.id && app.setMode(o.id)}>{o.label}</button>
    {/each}
  </div>
{/if}

<style>
  .switch {
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    border-radius: 999px;
    background: var(--card-2);
    border: 1px solid var(--rule-strong);
  }
  button {
    border: 0;
    background: transparent;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
  }
  button:hover {
    color: var(--ink);
  }
  button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
    font-weight: 700;
  }
</style>
