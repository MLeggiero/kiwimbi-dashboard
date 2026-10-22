<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LegendItem } from '../charts/common';
  import { downloadCsv, downloadPng, type TableData } from '../lib/download';
  import type { ECharts } from '../lib/echarts';
  import { app } from '../lib/state.svelte';
  import DataTable from './DataTable.svelte';
  import EmptyState from './EmptyState.svelte';
  import Icon from './Icon.svelte';
  import Legend from './Legend.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    legend?: LegendItem[];
    table?: TableData;
    empty?: boolean;
    emptyText?: string;
    /** Set when the card holds an ECharts chart, to allow PNG export. */
    chart?: ECharts | null;
    controls?: Snippet;
    footer?: Snippet;
    children: Snippet;
  }
  let { title, subtitle, legend = [], table, empty = false, emptyText, chart = null, controls, footer, children }: Props = $props();
  let showTable = $state(false);

  // Exports are limited to managers: viewers can read every number (table view) but
  // bulk copies of proprietary data stay with the people accountable for them.
  const canExport = $derived(app.isManager);
  const png = () => {
    if (chart) downloadPng(title, chart, getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#ffffff');
  };
</script>

<section class="card chart-card" aria-label={title}>
  <header>
    <div class="titles">
      <h2>{title}</h2>
      {#if subtitle}<p>{subtitle}</p>{/if}
    </div>
    <div class="actions no-print">
      {@render controls?.()}
      {#if table && !empty}
        <button class="btn ghost" aria-pressed={showTable} onclick={() => (showTable = !showTable)}>
          <Icon name={showTable ? 'chart' : 'table'} size={15} />{showTable ? 'Chart' : 'Table'}
        </button>
        {#if canExport}
          <button class="btn ghost icon" title="Download CSV" aria-label="Download {title} as CSV" onclick={() => table && downloadCsv(title, table)}><Icon name="download" size={15} /></button>
          {#if chart && !showTable}
            <button class="btn ghost icon" title="Download image" aria-label="Download {title} as an image" onclick={png}><Icon name="image" size={15} /></button>
          {/if}
        {/if}
      {/if}
    </div>
  </header>
  {#if empty}
    <EmptyState text={emptyText} />
  {:else}
    {#if legend.length && !showTable}<Legend items={legend} />{/if}
    {#if showTable && table}
      <DataTable {table} caption="{title}: table view" />
    {:else}
      {@render children()}
    {/if}
  {/if}
  {@render footer?.()}
</section>

<style>
  .chart-card {
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .titles p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
</style>
