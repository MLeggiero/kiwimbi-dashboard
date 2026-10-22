<script lang="ts">
  import { fmtDayShort, isoToDay } from '../../shared/dates';
  import { SITE } from '../content';
  import { fmtAgo } from '../lib/format';
  import type { PrintTarget } from '../lib/print';
  import { app } from '../lib/state.svelte';
  import { setTheme, themeState, type ThemePref } from '../lib/theme.svelte';
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
  import Timeline from './Timeline.svelte';
  import ViewSwitch from './ViewSwitch.svelte';

  let { onprint }: { onprint: (target: PrintTarget) => void } = $props();

  const next: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeIcon = $derived(themeState.pref === 'light' ? 'sun' : themeState.pref === 'dark' ? 'moon' : 'monitor');
  const themeLabel = $derived(`Theme: ${themeState.pref === 'system' ? 'match device' : themeState.pref}. Click to change.`);
  const latest = $derived(app.data?.payload.latestSubmission ?? null);
  const managers = $derived(app.mode === 'managers');
</script>

<header class="mast" class:managers>
  <div class="row" class:wrap={!managers} class:shell-row={managers}>
    <a class="brand" href={SITE} target="_blank" rel="noopener noreferrer" title="kiwimbi.org (opens in a new tab)">
      <Logo height={56} />
    </a>
    <div class="title">
      <span class="name">{managers ? 'Managers’ view' : 'Our impact'}</span>
      <span class="sub">{managers ? 'Kenya programs, every report' : 'Kenya programs, live from the field · internal'}</span>
    </div>

    <div class="right no-print">
      {#if managers}
        {#if app.data}
          <span class="chip" title="Data refreshes from the Google Sheet about every 5 minutes">
            Updated {fmtAgo(app.fetchedAt, app.now)}{#if latest}<span class="latest">&nbsp;· latest report {fmtDayShort(isoToDay(latest))}</span>{/if}
          </span>
        {/if}
        <button class="btn ghost icon" aria-label="Refresh data" title="Refresh data" disabled={app.refreshing} onclick={() => app.load()}><Icon name="refresh" /></button>
        <button class="btn ghost icon" aria-label={themeLabel} title={themeLabel} onclick={() => setTheme(next[themeState.pref])}><Icon name={themeIcon} /></button>
        <button class="btn ghost icon" aria-label="Print this page" title="Print this page" onclick={() => onprint('page')}><Icon name="printer" /></button>
        <button class="btn" onclick={() => app.setMode('story')}>Back to the story</button>
      {:else}
        <ViewSwitch />
      {/if}
    </div>
  </div>
  {#if !managers && app.data}
    <div class="wrap"><Timeline onprint={() => onprint('report')} /></div>
  {/if}
</header>

<style>
  .mast {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
  }
  .mast.managers {
    position: static;
    margin-bottom: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 76px;
    flex-wrap: wrap;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .shell-row {
    max-width: 1320px;
    margin: 0 auto;
    padding-left: var(--gutter);
    padding-right: var(--gutter);
  }
  .brand {
    display: inline-flex;
    flex: none;
  }
  .title {
    display: flex;
    flex-direction: column;
    padding-left: 14px;
    border-left: 1px solid var(--rule-strong);
    line-height: 1.2;
  }
  .name {
    font-weight: 800;
    font-stretch: 75%;
    font-size: 22px;
    letter-spacing: -0.01em;
  }
  .sub {
    font-size: 12px;
    color: var(--ink-3);
  }
  .right {
    display: flex;
    align-items: center;
    gap: 6px 14px;
    margin-left: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .managers .right {
    gap: 4px;
  }
  .chip {
    margin-right: 6px;
  }
  @media (max-width: 720px) {
    .mast {
      position: static;
    }
    .sub,
    .latest {
      display: none;
    }
    .title {
      padding-left: 10px;
    }
    .name {
      font-size: 19px;
    }
  }
</style>
