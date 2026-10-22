<script lang="ts">
  // The story's timeline: quick ranges, custom dates and a draggable slider over every
  // week with reports. It drives the same range as the managers' filters.
  import { dayParts, dayToIso, fmtDay, fmtRange, isoToDay } from '../../shared/dates';
  import { storyOffersYtd, storyPresets, type Preset } from '../lib/presets';
  import { app } from '../lib/state.svelte';
  import { monthLong } from '../lib/story';
  import Icon from './Icon.svelte';
  import RangeBrush from './RangeBrush.svelte';

  let { onprint }: { onprint: () => void } = $props();

  const ds = $derived(app.data!);
  const year = $derived(dayParts(ds.today).y);
  const since = $derived.by(() => {
    const f = dayParts(ds.firstDay);
    return `Since ${monthLong(f.m).slice(0, 3)} ${f.d}${f.y === year ? '' : `, ${f.y}`}`;
  });
  const labels = $derived<Record<string, string>>({ last1w: '1 week', last1m: '1 month', last3m: '3 months', ytd: 'YTD', term: 'This term', lastyear: String(year - 1), all: since });
  // Ranges that fall entirely before the first report (or would repeat YTD) aren't offered.
  // YTD is greyed out until reports reach back to January 1.
  const order = ['last1w', 'last1m', 'last3m', 'ytd', 'term', 'lastyear', 'all'] as const;
  const ytdOff = $derived(!storyOffersYtd(ds));
  const choices = $derived(
    order.filter((p) => storyPresets(ds).includes(p)).map((p): { id: Preset; label: string; off: boolean } => ({ id: p, label: labels[p], off: p === 'ytd' && ytdOff })),
  );
  let open = $state(false);
  const from = $derived(app.range[0]);
  const to = $derived(app.range[1]);

  function setDate(which: 'from' | 'to', value: string) {
    const d = isoToDay(value);
    if (!Number.isFinite(d)) return;
    if (which === 'from') app.setCustom(d, to);
    else app.setCustom(from, d);
  }
</script>

<div class="timeline no-print">
  <div class="bar">
    <div class="pick">
      <span class="lbl" id="timeline-label">Timeline</span>
      <div class="choices" role="group" aria-labelledby="timeline-label">
        {#each choices as c (c.id)}
          <button aria-pressed={app.activePreset === c.id} disabled={c.off} title={c.off ? `Not available yet: reports start ${fmtDay(ds.firstDay)}` : undefined} onclick={() => app.setPreset(c.id)}>{c.label}</button>
        {/each}
        <button aria-pressed={app.activePreset === 'custom'} aria-expanded={open} onclick={() => (open = !open)}>Custom</button>
      </div>
    </div>
    <span class="range num" aria-live="polite"><span class="showing">Showing</span> {fmtRange(from, to)}</span>
    <button class="print" onclick={onprint} title="A two-page impact report for these dates: print it, or choose “Save as PDF” in the print window">
      <Icon name="printer" size={15} /> Print report
    </button>
  </div>
  {#if open}
    <div class="panel">
      <div class="dates">
        <label>From <input type="date" value={dayToIso(from)} min={dayToIso(ds.firstDay)} max={dayToIso(to)} onchange={(e) => setDate('from', e.currentTarget.value)} /></label>
        <label>To <input type="date" value={dayToIso(to)} min={dayToIso(from)} max={dayToIso(ds.today)} onchange={(e) => setDate('to', e.currentTarget.value)} /></label>
        <span class="hint">or drag the window below</span>
      </div>
      <RangeBrush />
    </div>
  {/if}
</div>

<style>
  .timeline {
    border-top: 1px solid var(--rule);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px 24px;
    min-height: 44px;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    min-width: 0;
  }
  .lbl {
    flex: none;
    padding-right: 14px;
    border-right: 1px solid var(--rule-strong);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--earth-deep);
  }
  .choices {
    display: flex;
    gap: 4px 18px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
  }
  .choices button {
    flex: none;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    padding: 10px 0 7px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
    white-space: nowrap;
  }
  .choices button:hover {
    color: var(--ink);
  }
  .choices button:disabled {
    color: var(--ink-3);
    opacity: 0.45;
    cursor: not-allowed;
  }
  .choices button[aria-pressed='true'] {
    color: var(--ink);
    font-weight: 800;
    border-bottom-color: var(--earth);
  }
  .range {
    flex: none;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .showing {
    font-weight: 400;
    color: var(--ink-3);
  }
  .print {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--ink);
    border-radius: 3px;
    background: transparent;
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .print:hover {
    background: var(--ink);
    color: var(--paper);
  }
  .panel {
    padding: 4px 0 10px;
  }
  .dates {
    display: flex;
    align-items: center;
    gap: 8px 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--ink-3);
  }
  .dates label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dates input {
    height: 32px;
    border: 1px solid var(--rule-strong);
    border-radius: 3px;
    background: var(--card);
    color: var(--ink);
    padding: 0 8px;
    font-size: 13px;
  }
  .hint {
    font-style: italic;
  }
  @media (max-width: 720px) {
    .bar {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }
    .range {
      padding-bottom: 8px;
    }
    .print {
      align-self: flex-start;
      margin-bottom: 10px;
    }
  }
</style>
