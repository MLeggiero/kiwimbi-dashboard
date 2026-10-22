<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Dashboard from './Dashboard.svelte';
  import Icon from './components/Icon.svelte';
  import Logo from './components/Logo.svelte';
  import Masthead from './components/Masthead.svelte';
  import { waitForImages, type PrintTarget } from './lib/print';
  import { app } from './lib/state.svelte';
  import { setTheme, themeState } from './lib/theme.svelte';
  import { readParams, writeParams } from './lib/url';
  import PrintReport from './print/PrintReport.svelte';
  import Story from './story/Story.svelte';

  let paramsRead = $state(false);

  onMount(() => {
    readParams().then((p) => {
      app.applyParams(p);
      paramsRead = true;
    });
    void app.load();
    // Keep "updated N min ago" fresh and pull new data every 10 minutes while the tab is visible.
    const tick = setInterval(() => {
      app.now = Date.now();
      if (document.visibilityState === 'visible' && !app.refreshing && Date.now() - app.fetchedAt > 10 * 60_000) void app.load();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && app.fetchedAt && Date.now() - app.fetchedAt > 5 * 60_000) void app.load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  $effect(() => {
    const params = app.toParams();
    if (paramsRead && app.data) writeParams(params);
  });

  // The dashboard and the story use different page colors (see app.css).
  $effect(() => {
    document.documentElement.dataset.view = app.data && app.mode === 'managers' ? 'managers' : 'story';
  });

  // What the browser prints: the impact report from the story (also for the browser's own
  // Print command), the page on screen from the dashboard, unless a button asked otherwise.
  $effect(() => {
    document.documentElement.dataset.print = app.printTarget ?? (app.data && app.mode === 'managers' ? 'page' : 'report');
  });

  async function print(target: PrintTarget) {
    app.printTarget = target;
    await tick();
    const previous = themeState.pref;
    if (target === 'page') {
      // Dashboard pages print in the light theme, with every photo and chart loaded.
      setTheme('light');
      for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
    }
    await waitForImages(target === 'report' ? document.querySelector('.print-report') : document.body);
    await new Promise((resolve) => setTimeout(resolve, target === 'page' ? 600 : 50));
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', finish);
      if (target === 'page') setTheme(previous);
      app.printTarget = null;
    };
    window.addEventListener('afterprint', finish);
    window.print();
    // Some browsers don't send afterprint; tidy up anyway once the dialog has had time.
    setTimeout(finish, 60_000);
  }
</script>

{#if app.loading && !app.data}
  <div class="center" role="status">
    <div class="loader"><Logo height={72} /></div>
    <p>Gathering the latest reports from Kenya…</p>
  </div>
{:else if !app.data}
  <div class="center">
    <div class="error">
      <Icon name="alert" size={22} />
      <div>
        <h1>The page couldn’t load</h1>
        <p>{app.error}</p>
        <button class="btn accent" onclick={() => app.load()}><Icon name="refresh" size={15} /> Try again</button>
      </div>
    </div>
  </div>
{:else if app.mode === 'managers'}
  <Dashboard onprint={print} />
{:else}
  <Masthead onprint={print} />
  {#if app.error}
    <div class="banner no-print" role="status"><Icon name="alert" size={15} /> Couldn’t refresh just now ({app.error}). Showing the last figures loaded.</div>
  {/if}
  <Story onprint={print} />
{/if}
{#if app.data}
  <PrintReport />
{/if}

<style>
  .center {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 18px;
    min-height: 80vh;
    padding: 24px;
    text-align: center;
    color: var(--ink-3);
  }
  .loader {
    animation: breathe 1.4s ease-in-out infinite alternate;
  }
  @keyframes breathe {
    to {
      transform: scale(1.05);
      opacity: 0.7;
    }
  }
  .error {
    display: flex;
    gap: 14px;
    text-align: left;
    max-width: 520px;
    padding-top: 16px;
    border-top: 3px solid var(--crit);
    color: var(--crit);
  }
  .error h1 {
    font-size: 26px;
    margin-bottom: 6px;
  }
  .error p {
    color: var(--ink-2);
    margin: 0 0 14px;
  }
  .banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px var(--gutter);
    background: var(--warn-bg);
    color: var(--warn);
    font-size: 13px;
  }
</style>
