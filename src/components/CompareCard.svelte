<script lang="ts">
  // Period A against period B for the page's measures, with a chart of the chosen measure
  // over the chart's dates and both periods shaded on it. Shown while a comparison is on.
  import { CLASS_METRICS, ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID, STAFF_MEALS } from '../../shared/metrics';
  import type { MetricId } from '../../shared/types';
  import { buildTimeSeries } from '../charts/timeseries';
  import { compareMetrics, periodText } from '../lib/compare';
  import { currentView, periodWord } from '../lib/current.svelte';
  import type { ECharts } from '../lib/echarts';
  import { fmtInt, fmtOne, fmtPct } from '../lib/format';
  import { app, type PageId } from '../lib/state.svelte';
  import { REPORTING_LAG_DAYS } from '../lib/view';
  import ChartCard from './ChartCard.svelte';
  import EChart from './EChart.svelte';
  import Icon from './Icon.svelte';

  type Row = { label: string; metrics: MetricId[] };
  const one = (id: MetricId, label = METRIC_BY_ID[id].label): Row => ({ label, metrics: [id] });
  const ROWS: Partial<Record<PageId, Row[]>> = {
    overview: [
      { label: 'School meals', metrics: MEAL_SCHOOLS },
      one('library_visits'),
      one('books_checked_out'),
      { label: 'Mentorship classes', metrics: CLASS_METRICS },
      { label: 'Program attendances', metrics: ENRICHMENT },
    ],
    meals: [{ label: 'School meals (3 schools)', metrics: MEAL_SCHOOLS }, ...MEAL_SCHOOLS.map((id) => one(id, METRIC_BY_ID[id].short)), one(STAFF_MEALS[0], 'Staff & tailoring')],
    library: [one('library_visits'), one('books_checked_out')],
    mentorship: [{ label: 'Classes taught', metrics: CLASS_METRICS }, one('classes_primary', 'Primary'), one('classes_secondary', 'Secondary')],
    programs: [{ label: 'Program attendances', metrics: ENRICHMENT }, ...ENRICHMENT.map((id) => one(id, METRIC_BY_ID[id].short)), one('agronomy_workshops')],
  };

  const ctx = $derived.by(currentView);
  const c = $derived(ctx.comparison);
  const rows = $derived(
    (c ? (ROWS[app.page] ?? []) : []).map((r) => {
      const m = compareMetrics(ctx.ds, r.metrics, c!);
      return { ...r, ...m, perWord: METRIC_BY_ID[r.metrics[0]].activeDays === 'all' ? 'a day' : 'a school day' };
    }),
  );
  let picked = $state('');
  const sel = $derived(rows.find((r) => r.label === picked) ?? rows[0]);

  const chart = $derived(
    sel
      ? buildTimeSeries({ ctx, title: sel.label, series: [{ name: sel.label, color: ctx.theme.series[0], metrics: sel.metrics }], unit: 'reported', activeDays: METRIC_BY_ID[sel.metrics[0]].activeDays })
      : null,
  );
  let chartRef = $state.raw<ECharts | null>(null);

  const notes = $derived.by(() => {
    const out: string[] = [];
    if (!c) return out;
    if (!c.sameLength) out.push('The periods differ in length, so changes compare daily averages.');
    if (c.a.to >= ctx.ds.today - (REPORTING_LAG_DAYS - 1) || c.b.to >= ctx.ds.today - (REPORTING_LAG_DAYS - 1)) out.push('The last two weeks may still be missing late reports.');
    if (c.b.to < ctx.ds.firstDay) out.push('B is before the first report, so there is nothing to compare with yet.');
    return out;
  });
  const fmtRate = (v: number | null) => (v === null ? '–' : v < 10 ? fmtOne(v) : fmtInt(v));
</script>

{#if sel && chart && c}
  <div class="compare-card">
    <ChartCard
      title="Period A vs period B"
      subtitle="A: {periodText(c.a)}. B: {periodText(c.b)}. The chart shows {sel.label.toLowerCase()} per {periodWord(ctx)} across the chart’s dates, with both periods shaded."
      legend={chart.legend}
      table={chart.table}
      empty={chart.empty}
      chart={chartRef}
    >
      {#snippet controls()}
        <select class="input" aria-label="Measure shown on the comparison chart" value={sel.label} onchange={(e) => (picked = e.currentTarget.value)}>
          {#each rows as r (r.label)}<option value={r.label}>{r.label}</option>{/each}
        </select>
      {/snippet}
      <div class="body">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" class="num"><span class="chip a">A</span></th>
                <th scope="col" class="num"><span class="chip b">B</span></th>
                <th scope="col" class="num">{c.sameLength ? 'Change' : 'Change per day'}</th>
              </tr>
            </thead>
            <tbody>
              {#each rows as r (r.label)}
                <tr class:sel={r === sel} onclick={() => (picked = r.label)}>
                  <th scope="row"><button class="pick" aria-pressed={r === sel} title="Show on the chart">{r.label}</button></th>
                  <td class="num">
                    <strong>{r.a.coveredDays ? fmtInt(r.a.total) : '–'}</strong>
                    <small>{r.aRate === null ? 'no reports' : `${fmtRate(r.aRate)} ${r.perWord}`}</small>
                  </td>
                  <td class="num">
                    <strong>{r.b.coveredDays ? fmtInt(r.b.total) : '–'}</strong>
                    <small>{r.bRate === null ? 'no reports' : `${fmtRate(r.bRate)} ${r.perWord}`}</small>
                  </td>
                  <td class="num">
                    {#if r.change === null}
                      <span class="badge neutral" title="Too few reports in one of the periods to compare fairly">n/a</span>
                    {:else}
                      <span class="badge {r.change >= 0 ? 'good' : 'crit'}"><Icon name={r.change >= 0 ? 'arrow-up' : 'arrow-down'} size={12} />{fmtPct(r.change)}</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#each notes as n (n)}<p class="note">{n}</p>{/each}
        </div>
        <div class="plot">
          <EChart option={chart.option} height={240} label={chart.summary} onready={(x) => (chartRef = x)} />
        </div>
      </div>
    </ChartCard>
  </div>
{/if}

<style>
  .compare-card {
    margin-bottom: 16px;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 20px;
    align-items: start;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--rule);
    text-align: left;
    vertical-align: middle;
  }
  thead th {
    font-size: 12px;
    color: var(--ink-3);
    font-weight: 700;
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
  td strong {
    display: block;
    font-variant-numeric: tabular-nums;
  }
  td small {
    color: var(--ink-3);
    font-size: 11px;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover,
  tr.sel {
    background: var(--card-2);
  }
  .pick {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  tr.sel .pick {
    font-weight: 800;
  }
  .chip {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    font-size: 11px;
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
  .note {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--ink-3);
  }
  .table-wrap {
    min-width: 0;
    overflow-x: auto;
  }
  @media (max-width: 900px) {
    .body {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    th,
    td {
      padding: 6px 4px;
    }
    td small {
      display: block;
      white-space: normal;
    }
  }
</style>
