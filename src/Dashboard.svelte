<script lang="ts">
  // The managers' dashboard: highlights for the latest week, month and year at the top of each
  // page, then the charts for the chosen dates, each titled with its takeaway. Checks on the
  // reports themselves (who reported, rows to fix) are on Data health only. Managers only.
  import { fmtDay, fmtRange } from '../shared/dates';
  import ComparePeriods from './components/ComparePeriods.svelte';
  import FilterBar from './components/FilterBar.svelte';
  import Icon from './components/Icon.svelte';
  import NavTabs from './components/NavTabs.svelte';
  import PageHighlights from './components/PageHighlights.svelte';
  import TopBar from './components/TopBar.svelte';
  import type { PrintTarget } from './lib/print';
  import { app, PAGES } from './lib/state.svelte';
  import DataHealth from './pages/DataHealth.svelte';
  import Library from './pages/Library.svelte';
  import Meals from './pages/Meals.svelte';
  import Mentorship from './pages/Mentorship.svelte';
  import Overview from './pages/Overview.svelte';
  import Programs from './pages/Programs.svelte';

  let { onprint }: { onprint: (target: PrintTarget) => void } = $props();

  const pageLabel = $derived(PAGES.find((p) => p.id === app.page)?.label ?? '');
</script>

<div class="shell">
  <TopBar {onprint} />
  <NavTabs />
  {#if app.error}
    <div class="banner no-print" role="status"><Icon name="alert" size={15} /> Couldn’t refresh just now ({app.error}). Showing the last data loaded.</div>
  {/if}
  <div class="print-only print-head">
    <strong>Kiwimbi Impact · {pageLabel}</strong> · {fmtRange(app.range[0], app.range[1])} · printed {fmtDay(app.data!.today)} · Confidential
  </div>
  <main class:dim={app.refreshing} aria-busy={app.refreshing}>
    <PageHighlights />
    <FilterBar charts={app.page !== 'health'} />
    {#if app.comparison && app.page !== 'health'}<ComparePeriods />{/if}
    {#key app.page}
      {#if app.page === 'overview'}
        <Overview />
      {:else if app.page === 'meals'}
        <Meals />
      {:else if app.page === 'library'}
        <Library />
      {:else if app.page === 'mentorship'}
        <Mentorship />
      {:else if app.page === 'programs'}
        <Programs />
      {:else if app.page === 'health'}
        <DataHealth />
      {/if}
    {/key}
  </main>
  <footer>
    <Icon name="lock" size={13} />
    Confidential: for Kiwimbi managers. Signed in as {app.data!.payload.viewer.email}. Figures come from the Kiwimbi Kenya data submission form and refresh about every 5 minutes.
    Staff and tailoring meals appear on the Meals page only and are never part of the meals count.
  </footer>
</div>

<style>
  main {
    transition: opacity 0.2s;
  }
  footer {
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px solid var(--rule);
    font-size: 12px;
    color: var(--ink-3);
  }
  .banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
    border-radius: 12px;
    background: var(--warn-bg);
    color: var(--warn);
    font-size: 13px;
  }
  .print-head {
    margin-bottom: 12px;
    font-size: 12px;
  }
</style>
