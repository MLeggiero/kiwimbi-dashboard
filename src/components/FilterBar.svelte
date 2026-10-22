<script lang="ts">
  import { dayToIso, fmtRange, isoToDay } from '../../shared/dates';
  import { FOCUS_CHOICES, lengthText, type CompareMode, type Focus } from '../lib/compare';
  import { availablePresets, PRESETS, type Preset } from '../lib/presets';
  import { app, type GranChoice, type ViewMode } from '../lib/state.svelte';
  import Icon from './Icon.svelte';
  import RangeBrush from './RangeBrush.svelte';

  const GRAN: [GranChoice, string][] = [
    ['auto', 'Auto'],
    ['week', 'Week'],
    ['month', 'Month'],
    ['term', 'Term'],
  ];
  const VIEWS: [ViewMode, string][] = [
    ['weekly', 'Totals'],
    ['cumulative', 'Running total'],
    ['rate', 'Per school day'],
  ];

  let open = $state(false);
  const from = $derived(app.range[0]);
  const to = $derived(app.range[1]);
  const hasTerms = $derived((app.data?.terms.length ?? 0) > 0);
  const offered = $derived(app.data ? availablePresets(app.data) : []);

  const c = $derived(app.comparison);
  const canYoy = $derived(!!app.data && app.data.today - app.data.firstDay >= 365);
  const focusChoices = $derived(FOCUS_CHOICES.filter((f) => f.id !== 'term' || hasTerms));
  // Bands for the timeline below: B always, A unless it is the chart's own dates.
  const marks = $derived(c ? [...(c.whole ? [] : [{ key: 'A', from: c.a.from, to: c.a.to, color: 'a' as const }]), { key: 'B', from: c.b.from, to: c.b.to, color: 'b' as const }] : []);
  const offChart = $derived(!!c && !c.whole && (c.a.from < from || c.a.to > to || c.b.from < from || c.b.to > to));

  function setPeriod(which: 'A' | 'B', end: 0 | 1, value: string) {
    const d = isoToDay(value);
    if (!Number.isFinite(d) || !c) return;
    const p: [number, number] = which === 'A' ? [c.a.from, c.a.to] : [c.b.from, c.b.to];
    p[end] = d;
    const next: [number, number] = [Math.min(...p), Math.max(...p)];
    if (which === 'A') app.customA = next;
    else app.customB = next;
  }

  function setDate(which: 'from' | 'to', value: string) {
    const d = isoToDay(value);
    if (!Number.isFinite(d)) return;
    if (which === 'from') app.setCustom(d, to);
    else app.setCustom(from, d);
  }
</script>

<div class="card flat filters no-print" role="group" aria-label="Filters for every chart on the page">
  <div class="row">
    <label class="field">
      Date range
      <select class="input" value={app.activePreset} onchange={(e) => app.setPreset(e.currentTarget.value as Preset)}>
        {#each PRESETS.filter((p) => p.id === 'custom' || p.id === app.activePreset || offered.includes(p.id)) as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
      </select>
    </label>
    {#if app.preset === 'custom'}
      <label class="field">From <input class="input" type="date" value={dayToIso(from)} min={app.data ? dayToIso(app.data.firstDay) : undefined} max={dayToIso(to)} onchange={(e) => setDate('from', e.currentTarget.value)} /></label>
      <label class="field">To <input class="input" type="date" value={dayToIso(to)} min={dayToIso(from)} onchange={(e) => setDate('to', e.currentTarget.value)} /></label>
    {/if}
    <button class="btn more-toggle" aria-expanded={open} aria-controls="chart-options" onclick={() => (open = !open)}>
      <Icon name="chart" size={15} />{open ? 'Hide options' : 'Options'}
    </button>
    <div class="more" class:open id="chart-options">
    <div class="field">
      <span>Group by</span>
      <div class="seg" role="group" aria-label="Group by">
        {#each GRAN as [id, label] (id)}
          <button aria-pressed={app.gran === id} title={id === 'term' && !hasTerms ? 'Add a "Dashboard Terms" tab to the sheet to group by school term' : undefined} onclick={() => (app.gran = id)}>{label}</button>
        {/each}
      </div>
    </div>
    <div class="field">
      <span>Show</span>
      <div class="seg" role="group" aria-label="Show">
        {#each VIEWS as [id, label] (id)}
          <button aria-pressed={app.view === id} onclick={() => (app.view = id)}>{label}</button>
        {/each}
      </div>
    </div>
    <label class="field">
      Compare with
      <select class="input" value={app.compare} onchange={(e) => app.setCompare(e.currentTarget.value as CompareMode)}>
        <option value="none">Nothing</option>
        <option value="prev">The period before</option>
        {#if canYoy || app.compare === 'yoy'}<option value="yoy">Same dates last year</option>{/if}
        <option value="custom">Custom dates</option>
      </select>
    </label>
    </div>
    <p class="showing" aria-live="polite">{fmtRange(from, to)}</p>
  </div>
  {#if c}
    <div class="compare" role="group" aria-label="Periods being compared">
      <div class="period">
        <span class="chip a" aria-hidden="true">A</span>
        <select class="input" aria-label="Period A" value={app.focus} onchange={(e) => app.setFocus(e.currentTarget.value as Focus)}>
          {#each focusChoices as f (f.id)}<option value={f.id}>{f.label}</option>{/each}
        </select>
        {#if app.focus === 'custom'}
          <input class="input" type="date" aria-label="Period A starts" value={dayToIso(c.a.from)} onchange={(e) => setPeriod('A', 0, e.currentTarget.value)} />
          <span class="dash">–</span>
          <input class="input" type="date" aria-label="Period A ends" value={dayToIso(c.a.to)} onchange={(e) => setPeriod('A', 1, e.currentTarget.value)} />
        {:else}
          <span class="dates">{fmtRange(c.a.from, c.a.to)}</span>
        {/if}
        <span class="len">{lengthText(c.a.days)}</span>
      </div>
      <span class="vs">vs</span>
      <div class="period">
        <span class="chip b" aria-hidden="true">B</span>
        {#if app.compare === 'custom'}
          <input class="input" type="date" aria-label="Period B starts" value={dayToIso(c.b.from)} onchange={(e) => setPeriod('B', 0, e.currentTarget.value)} />
          <span class="dash">–</span>
          <input class="input" type="date" aria-label="Period B ends" value={dayToIso(c.b.to)} onchange={(e) => setPeriod('B', 1, e.currentTarget.value)} />
        {:else}
          <span class="dates">{fmtRange(c.b.from, c.b.to)}</span>
        {/if}
        <span class="len">{lengthText(c.b.days)}</span>
      </div>
      {#if !c.sameLength}<span class="note">Different lengths: changes compare daily averages</span>{/if}
      {#if offChart}
        <button class="btn" onclick={() => app.showComparison()} title="Widen the chart dates to cover both periods">Show A and B on the charts</button>
      {/if}
    </div>
  {/if}
  <RangeBrush {marks} />
</div>

<style>
  .filters {
    padding: 12px 16px 6px;
    margin-bottom: 18px;
  }
  .row {
    display: flex;
    align-items: flex-end;
    gap: 12px 16px;
    flex-wrap: wrap;
  }
  .showing {
    margin: 0 0 7px auto;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .more {
    display: contents;
  }
  .compare {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--rule);
    font-size: 13px;
  }
  .period {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
  }
  .chip {
    display: inline-grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 800;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 14%, transparent);
    border: 1.5px dashed var(--c);
  }
  .chip.a {
    --c: var(--cmp-a);
  }
  .chip.b {
    --c: var(--cmp-b);
  }
  .dates {
    font-weight: 700;
    color: var(--ink);
  }
  .len,
  .vs,
  .dash {
    color: var(--ink-3);
  }
  .vs {
    font-weight: 700;
  }
  .note {
    color: var(--ink-3);
    font-style: italic;
  }
  .more-toggle {
    display: none;
  }
  @media (max-width: 720px) {
    .showing {
      margin-left: 0;
      width: 100%;
    }
    .more-toggle {
      display: inline-flex;
    }
    .more {
      display: none;
      width: 100%;
      flex-direction: column;
      gap: 12px;
    }
    .more.open {
      display: flex;
    }
  }
</style>
