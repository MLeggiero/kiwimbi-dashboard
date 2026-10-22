<script lang="ts">
  import { fmtDay } from '../../shared/dates';
  import Logo from '../components/Logo.svelte';
  import { DATA_NOTICE, MISSION, SITE } from '../content';
  import { fmtAgo } from '../lib/format';
  import type { PrintTarget } from '../lib/print';
  import { app } from '../lib/state.svelte';
  import { setTheme, themeState, type ThemePref } from '../lib/theme.svelte';

  let { onprint }: { onprint: (target: PrintTarget) => void } = $props();
  const next: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
  const themeText = $derived(themeState.pref === 'system' ? 'Theme: match device' : `Theme: ${themeState.pref}`);
</script>

<footer class="foot">
  <div class="wrap">
    <div class="top">
      <Logo height={56} />
      <p class="ripple-line">{MISSION.ripple} Working in {MISSION.region}.</p>
    </div>
    <section id="notice" class="notice" aria-labelledby="notice-title">
      <h2 id="notice-title">{DATA_NOTICE.title}</h2>
      <div class="notice-text">
        {#each DATA_NOTICE.paragraphs as text, i (i)}<p>{text}</p>{/each}
      </div>
    </section>
    <div class="bottom">
      <p>
        <strong>Internal:</strong> for Kiwimbi staff only.
        {#if app.data}Signed in as {app.data.payload.viewer.email}.{/if}
        {#if app.data}Figures as of {fmtDay(app.data.today)}, updated {fmtAgo(app.fetchedAt, app.now)}.{/if}
      </p>
      <div class="links no-print">
        <button onclick={() => onprint('report')}>Print report or save as PDF</button>
        <button onclick={() => setTheme(next[themeState.pref])}>{themeText}</button>
        <a href={SITE} target="_blank" rel="noopener noreferrer">kiwimbi.org</a>
        {#if app.isManager}<button onclick={() => app.setMode('managers')}>Open the dashboard</button>{/if}
      </div>
    </div>
  </div>
</footer>

<style>
  .foot {
    background: var(--lake);
    color: var(--on-lake);
    padding: 48px 0 40px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 20px 28px;
    flex-wrap: wrap;
    padding-bottom: 28px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  }
  .foot :global(.logo) {
    background: #fbf8f1;
    padding: 4px 8px;
  }
  .ripple-line {
    flex: 1;
    min-width: 240px;
    margin: 0;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 20px;
    line-height: 1.4;
  }
  .notice {
    padding: 24px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  }
  .notice h2 {
    margin: 0 0 10px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--on-lake);
  }
  .notice-text {
    columns: 2 26em;
    column-gap: 40px;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--on-lake-2);
  }
  .notice-text p {
    margin: 0 0 10px;
    break-inside: avoid;
  }
  .bottom {
    display: flex;
    justify-content: space-between;
    gap: 16px 32px;
    flex-wrap: wrap;
    padding-top: 20px;
    font-size: 13px;
    color: var(--on-lake-2);
  }
  .bottom p {
    margin: 0;
    max-width: 60em;
  }
  .bottom strong {
    color: var(--on-lake);
  }
  .links {
    display: flex;
    gap: 6px 18px;
    flex-wrap: wrap;
  }
  .links button,
  .links a {
    border: 0;
    background: none;
    padding: 0;
    font-size: 13px;
    color: var(--on-lake);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
</style>
