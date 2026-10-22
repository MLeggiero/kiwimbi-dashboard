<script lang="ts">
  // The dashboard header (as in the first version), with the real logo and the view switch.
  import { fmtDayShort, isoToDay } from '../../shared/dates';
  import { fmtAgo } from '../lib/format';
  import type { PrintTarget } from '../lib/print';
  import { app } from '../lib/state.svelte';
  import { setTheme, themeState, type ThemePref } from '../lib/theme.svelte';
  import Icon from './Icon.svelte';
  import Logo from './Logo.svelte';
  import ViewSwitch from './ViewSwitch.svelte';

  let { onprint }: { onprint: (target: PrintTarget) => void } = $props();

  const next: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeIcon = $derived(themeState.pref === 'light' ? 'sun' : themeState.pref === 'dark' ? 'moon' : 'monitor');
  const themeLabel = $derived(`Theme: ${themeState.pref === 'system' ? 'match device' : themeState.pref}. Click to change.`);
  const latest = $derived(app.data?.payload.latestSubmission ?? null);
  const email = $derived(app.data?.payload.viewer.email ?? '');
</script>

<header class="topbar">
  <div class="brand">
    <Logo height={44} />
    <div>
      <div class="name">Kiwimbi Impact</div>
      <div class="tag">Kenya programs dashboard</div>
    </div>
  </div>
  <div class="right no-print">
    {#if app.data}
      <span class="chip fresh" title="Data refreshes from the Google Sheet about every 5 minutes">
        <span class="pulse" class:busy={app.refreshing}></span>
        Updated {fmtAgo(app.fetchedAt, app.now)}{#if latest}<span class="latest">&nbsp;· latest report {fmtDayShort(isoToDay(latest))}</span>{/if}
      </span>
    {/if}
    <button class="btn ghost icon" aria-label="Refresh data" title="Refresh data" disabled={app.refreshing} onclick={() => app.load()}><Icon name="refresh" /></button>
    <button class="btn ghost icon" aria-label={themeLabel} title={themeLabel} onclick={() => setTheme(next[themeState.pref])}><Icon name={themeIcon} /></button>
    <button class="btn ghost icon" aria-label="Print this page" title="Print this page" onclick={() => onprint('page')}><Icon name="printer" /></button>
    <button class="btn" title="A two-page impact report for the dates in the filters: print it, or choose “Save as PDF”" onclick={() => onprint('report')}><Icon name="printer" size={15} /> Print report</button>
    <ViewSwitch />
    {#if email}
      <span class="user" title="Signed in as {email}"><Icon name="lock" size={13} />{email}</span>
    {/if}
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0 12px;
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .name {
    font-family: var(--font-head);
    font-weight: 700;
    font-size: 19px;
    letter-spacing: -0.01em;
  }
  .tag {
    font-size: 12px;
    color: var(--ink-3);
  }
  .right {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
  .fresh {
    margin-right: 4px;
  }
  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--leaf);
  }
  .pulse.busy {
    animation: blink 0.8s ease-in-out infinite alternate;
  }
  @keyframes blink {
    to {
      opacity: 0.3;
    }
  }
  .right :global(.switch) {
    margin-left: 6px;
  }
  .user {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--ink-3);
    margin-left: 8px;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 900px) {
    .user {
      display: none;
    }
  }
  @media (max-width: 560px) {
    .latest {
      display: none;
    }
  }
</style>
