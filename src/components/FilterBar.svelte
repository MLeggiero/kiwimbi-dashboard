<script lang="ts">
  // The dates for the charts below: one labelled button that opens every quick range, typed
  // dates and the slider; Earlier and Later to step through time; the page's main total for
  // those dates; and the chart options and the comparison folded away underneath.
  import { dayToIso, fmtRange, isoToDay } from '../../shared/dates';
  import { ENRICHMENT, MEAL_SCHOOLS, TEACHING_METRICS } from '../../shared/metrics';
  import type { SeriesKey } from '../lib/dataset';
  import { fmtInt } from '../lib/format';
  import { availablePresets, PRESETS } from '../lib/presets';
  import { rangeStats } from '../lib/series';
  import { app, type GranChoice, type PageId, type ViewMode } from '../lib/state.svelte';
  import Icon from './Icon.svelte';
  import RangeBrush from './RangeBrush.svelte';

  let { charts = true }: { charts?: boolean } = $props();

  /** The page's main measure, totalled for the chosen dates beside them. */
  const TOTALS: Partial<Record<PageId, { metrics: SeriesKey[]; unit: string }>> = {
    meals: { metrics: MEAL_SCHOOLS, unit: 'school meals' },
    library: { metrics: ['library_visits'], unit: 'library visits' },
    mentorship: { metrics: TEACHING_METRICS, unit: 'teaching contact hours' },
    programs: { metrics: ENRICHMENT, unit: 'program attendances' },
  };

  let open = $state(false);
  let more = $state(false);
  const ds = $derived(app.data!);
  const from = $derived(app.range[0]);
  const to = $derived(app.range[1]);
  const offered = $derived(availablePresets(ds));
  const quick = $derived(PRESETS.filter((p) => p.id !== 'custom' && (p.id === app.activePreset || offered.includes(p.id))));
  const label = $derived(PRESETS.find((p) => p.id === app.activePreset)?.label ?? 'Custom dates');
  const total = $derived.by(() => {
    const t = TOTALS[app.page];
    const st = t ? rangeStats(ds, t.metrics, from, to) : null;
    return t && st?.coveredDays ? `${fmtInt(st.total)} ${t.unit}` : null;
  });

  const word = $derived(app.granularity === 'week' ? 'week' : app.granularity === 'month' ? 'month' : 'term');
  const GRAN: [GranChoice, string][] = [
    ['auto', 'Best fit'],
    ['week', 'Week'],
    ['month', 'Month'],
    ['term', 'Term'],
  ];
  const views = $derived<[ViewMode, string][]>([
    ['weekly', `Per ${word}`],
    ['cumulative', 'Total so far'],
    ['rate', 'Per school day'],
  ]);
  const hasTerms = $derived(ds.terms.length > 0);
  const canLastYear = $derived(ds.today - ds.firstDay >= 365);
  /** Chart options in use, so a folded panel still says why the charts look as they do. */
  const inUse = $derived(
    [app.gran === 'auto' ? '' : `by ${app.gran}`, app.view === 'cumulative' ? 'total so far' : app.view === 'rate' ? 'per school day' : '', app.lastYear ? 'with last year' : ''].filter(Boolean).join(', '),
  );

  function setDate(which: 'from' | 'to', value: string) {
    const d = isoToDay(value);
    if (!Number.isFinite(d)) return;
    if (which === 'from') app.setCustom(d, to);
    else app.setCustom(from, d);
  }
</script>

<div class="card flat datebar no-print" role="group" aria-label="Dates for the charts on this page">
  <div class="bar">
    <span class="lead">{charts ? 'Charts show' : 'Showing'}</span>
    <button class="btn pick" aria-expanded={open} aria-controls="date-choices" onclick={() => (open = !open)}>
      <Icon name="calendar" size={16} /><span>{label}</span><Icon name="chevron-down" size={16} />
    </button>
    <span class="dates" aria-live="polite"><span class="num">{fmtRange(from, to)}</span>{#if total}<span class="total">: {total}</span>{/if}</span>
    <span class="steps">
      {#if from > ds.firstDay}<button class="btn" onclick={() => app.stepRange(-1)}><Icon name="chevron-left" size={16} />Earlier</button>{/if}
      {#if to < ds.today}<button class="btn" onclick={() => app.stepRange(1)}>Later<Icon name="chevron-right" size={16} /></button>{/if}
    </span>
  </div>

  {#if open}
    <div class="choices" id="date-choices">
      <div class="quick" role="group" aria-label="Quick dates">
        {#each quick as p (p.id)}
          <button
            class="quick-btn"
            aria-pressed={app.activePreset === p.id}
            onclick={() => {
              app.setPreset(p.id);
              open = false;
            }}>{p.label}</button
          >
        {/each}
      </div>
      <div class="typed">
        <span>Or pick dates:</span>
        <label>From <input class="input" type="date" value={dayToIso(from)} min={dayToIso(ds.firstDay)} max={dayToIso(to)} onchange={(e) => setDate('from', e.currentTarget.value)} /></label>
        <label>To <input class="input" type="date" value={dayToIso(to)} min={dayToIso(from)} max={dayToIso(ds.today)} onchange={(e) => setDate('to', e.currentTarget.value)} /></label>
      </div>
      <p class="hint">Or drag the shaded window, or either of its edges:</p>
      <RangeBrush />
    </div>
  {/if}

  {#if charts}
    <div class="links">
      <button class="link" aria-expanded={more} aria-controls="chart-options" onclick={() => (more = !more)}>
        <Icon name="chart" size={15} />More chart options{#if inUse && !more}<span class="in-use">({inUse})</span>{/if}
      </button>
      <button class="link" aria-pressed={app.compare !== 'none'} onclick={() => (app.compare === 'none' ? app.openCompare() : app.setCompare('none'))}>
        <Icon name="swap" size={15} />{app.compare === 'none' ? 'Compare two periods' : 'Hide the comparison'}
      </button>
    </div>
    {#if more}
      <div class="options" id="chart-options">
        <div class="field">
          <span>Bars for each</span>
          <div class="seg" role="group" aria-label="Bars for each">
            {#each GRAN.filter(([id]) => id !== 'term' || hasTerms) as [id, text] (id)}
              <button aria-pressed={app.gran === id} onclick={() => (app.gran = id)}>{text}</button>
            {/each}
          </div>
        </div>
        <div class="field">
          <span>Show</span>
          <div class="seg" role="group" aria-label="Show">
            {#each views as [id, text] (id)}
              <button aria-pressed={app.view === id} onclick={() => (app.view = id)}>{text}</button>
            {/each}
          </div>
        </div>
        {#if canLastYear || app.lastYear}
          <label class="check"><input type="checkbox" checked={app.lastYear} onchange={(e) => (app.lastYear = e.currentTarget.checked)} />Show last year as a grey line</label>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .datebar {
    padding: 12px 16px;
    margin-bottom: 18px;
  }
  .bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 12px;
  }
  .lead {
    font-size: 15px;
    color: var(--ink-2);
  }
  .pick {
    height: 40px;
    padding: 0 14px;
    font-size: 15px;
    font-weight: 700;
  }
  .dates {
    font-size: 15px;
    font-weight: 700;
  }
  .total {
    font-weight: 400;
    color: var(--ink-2);
  }
  .steps {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }
  .steps .btn {
    height: 40px;
    font-size: 14px;
  }
  .choices {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--rule);
  }
  .quick {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .quick-btn {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--rule-strong);
    border-radius: 12px;
    background: var(--card);
    color: var(--ink);
    font-size: 15px;
    text-align: left;
    cursor: pointer;
  }
  .quick-btn:hover {
    border-color: var(--ink-3);
  }
  .quick-btn[aria-pressed='true'] {
    background: var(--leaf);
    border-color: var(--leaf);
    color: #1f2a2e;
    font-weight: 700;
  }
  .typed {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 14px;
    font-size: 15px;
    color: var(--ink-2);
  }
  .typed label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .typed .input {
    height: 40px;
    font-size: 15px;
  }
  .hint {
    margin: 14px 0 0;
    font-size: 14px;
    color: var(--ink-3);
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
    margin-top: 10px;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0;
    border: 0;
    background: none;
    font-size: 14px;
    font-weight: 600;
    color: var(--link);
    cursor: pointer;
  }
  .link:hover {
    text-decoration: underline;
  }
  .in-use {
    font-weight: 400;
    color: var(--ink-3);
  }
  .options {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 12px 20px;
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--rule);
  }
  .options .field {
    font-size: 13px;
  }
  .options .seg button {
    padding: 7px 14px;
    font-size: 14px;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 14px;
    color: var(--ink-2);
    cursor: pointer;
  }
  .check input {
    width: 18px;
    height: 18px;
  }
  @media (max-width: 640px) {
    .steps {
      margin-left: 0;
      width: 100%;
    }
    .steps .btn {
      flex: 1;
      justify-content: center;
    }
  }
</style>
