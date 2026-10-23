<script lang="ts">
  import { onMount } from 'svelte';
  import { METRIC_BY_ID, STREAMS } from '../../shared/metrics';
  import { fmtDay, fmtDayShort, isoToDay, startOfWeek } from '../../shared/dates';
  import type { IssueType } from '../../shared/types';
  import { buildCalendar } from '../charts/calendar';
  import ChartCard from '../components/ChartCard.svelte';
  import DotGrid from '../components/DotGrid.svelte';
  import EChart from '../components/EChart.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import Icon from '../components/Icon.svelte';
  import StatTile from '../components/StatTile.svelte';
  import { currentView } from '../lib/current.svelte';
  import { fmtInt } from '../lib/format';
  import { reportingGrid } from '../lib/manager';
  import { rangeStats } from '../lib/series';
  import { app } from '../lib/state.svelte';

  onMount(() => {
    void app.loadOps();
  });

  const LABELS: Record<IssueType, string> = {
    test_row: 'Test submission',
    non_numeric: 'Not a number',
    negative: 'Negative number',
    missing_dates: 'No dates',
    assumed_dates: 'Date assumed',
    end_before_start: 'Ends before it starts',
    date_out_of_range: 'Date looks wrong',
    long_span: 'Very long period',
    duplicate: 'Duplicate, left out',
    possible_duplicate: 'Possible duplicate',
    overlap: 'Overlapping dates',
    missing_column: 'Missing column',
    unmapped_column: 'Unused column',
    header_format: 'Header not understood',
    high_hours: 'Hours worth a look',
    mixed_teaching: 'Lessons and hours together',
    settings: 'Settings tab',
  };

  const ds = $derived(app.data!);
  const ops = $derived(app.ops);
  // Which programs reported lately, and on which days: here rather than on the other pages,
  // which show the figures only.
  const reporting = $derived(reportingGrid(ds));
  const ctx = $derived.by(currentView);
  const calendar = $derived(buildCalendar(ctx, 'streams'));
  const names = $derived(new Map((ops?.reporters ?? []).map((r) => [r.id, r.name])));
  const weeks = $derived.by(() => {
    const end = startOfWeek(Math.min(app.range[1], ds.today));
    const first = startOfWeek(ds.firstDay);
    return Array.from({ length: 12 }, (_, i) => end - 7 * (11 - i)).filter((w) => w >= first);
  });

  const reporterRows = $derived.by(() => {
    if (!ops) return [];
    const rows = new Map<string, number[]>();
    for (const s of ops.submissions) {
      if (!s.reporter) continue;
      const a = isoToDay(s.start ?? s.submitted ?? '');
      const b = isoToDay(s.end ?? s.submitted ?? '');
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const counts = rows.get(s.reporter) ?? Array(weeks.length).fill(0);
      weeks.forEach((w, i) => {
        if (b >= w && a <= w + 6) counts[i]++;
      });
      rows.set(s.reporter, counts);
    }
    return [...rows.entries()]
      .map(([id, counts]) => ({ id, name: names.get(id) ?? 'Unknown', counts, last: lastNonZero(counts) }))
      .filter((r) => r.last >= 0)
      .sort((a, b) => b.last - a.last || a.name.localeCompare(b.name));
  });

  const streamRows = $derived(STREAMS.map((s) => ({ label: s.label, cells: weeks.map((w) => rangeStats(ds, s.metrics, w, w + 6).coveredDays / 7) })));

  let typeFilter = $state<'all' | IssueType>('all');
  const typeCounts = $derived.by(() => {
    const c = new Map<IssueType, number>();
    for (const i of ops?.issues ?? []) c.set(i.type, (c.get(i.type) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  });
  const issues = $derived((ops?.issues ?? []).filter((i) => typeFilter === 'all' || i.type === typeFilter).sort((a, b) => (b.row ?? 1e9) - (a.row ?? 1e9)));

  const lag = $derived.by(() => {
    const bins = [
      { label: 'Same day', max: 0, n: 0 },
      { label: '1 day', max: 1, n: 0 },
      { label: '2–3 days', max: 3, n: 0 },
      { label: '4–7 days', max: 7, n: 0 },
      { label: '8–14 days', max: 14, n: 0 },
      { label: '15+ days', max: Infinity, n: 0 },
    ];
    for (const s of ops?.submissions ?? []) {
      if (!s.end || !s.submitted) continue;
      const d = Math.max(0, isoToDay(s.submitted) - isoToDay(s.end));
      bins.find((b) => d <= b.max)!.n++;
    }
    return bins;
  });
  const lagMax = $derived(Math.max(1, ...lag.map((b) => b.n)));
  const medianLag = $derived.by(() => {
    const ds2 = (ops?.submissions ?? []).filter((s) => s.end && s.submitted).map((s) => Math.max(0, isoToDay(s.submitted!) - isoToDay(s.end!))).sort((a, b) => a - b);
    return ds2.length ? ds2[Math.floor(ds2.length / 2)] : null;
  });

  function lastNonZero(counts: number[]): number {
    for (let i = counts.length - 1; i >= 0; i--) if (counts[i] > 0) return i;
    return -1;
  }

  const shade = (n: number) => (n === 0 ? 'empty' : n === 1 ? 'l1' : n <= 3 ? 'l2' : 'l3');
  const cover = (f: number) => (f === 0 ? 'empty' : f < 0.4 ? 'l1' : f < 0.7 ? 'l2' : 'l3');
  const rowLink = (row: number | null) => (row && ops?.sheetUrl ? `${ops.sheetUrl}&range=A${row}` : null);
  const q = $derived(ds.payload.quality ?? { rows: 0, used: 0, excluded: 0, flagged: 0 });
</script>

{#if app.opsError}
  <div class="card"><EmptyState icon="lock" text={app.opsError} /></div>
{:else if !ops}
  <div class="card"><EmptyState icon="clock" text="Loading reporting detail…" /></div>
{:else}
  <div class="grid kpis">
    <StatTile label="Submissions" value={q.rows} sub="Rows in the responses tab" color="var(--ink-3)" />
    <StatTile label="Values in the dashboard" value={q.used} sub="After checks" />
    <StatTile label="Left out" value={q.excluded} sub="Tests, typos, duplicates" color="var(--series-6)" />
    <StatTile label="With notes" value={q.flagged} sub="Kept, but worth a look" color="var(--series-4)" />
    <StatTile label="Typical reporting delay" value={medianLag} format={(v) => (v === null ? '–' : `${v} day${v === 1 ? '' : 's'}`)} sub={ds.payload.latestSubmission ? `Latest submission ${fmtDay(isoToDay(ds.payload.latestSubmission))}` : ''} color="var(--ink-3)" />
  </div>

  <section class="card block">
    <h2>{reporting.takeaway}</h2>
    <p class="sub">Reports in each of the last 12 weeks. Filled = at least one report that week. The note on the right is the latest day reported.</p>
    <DotGrid columns={reporting.weeks} rows={reporting.rows} label="Which programs reported in each of the last 12 weeks" unit="reported" />
  </section>

  <section class="card block">
    <h2>Who reported, week by week</h2>
    <p class="sub">Submissions whose dates fall in each week, for the {weeks.length} weeks up to {fmtDay(weeks[weeks.length - 1] + 6)}. Visible to dashboard managers only.</p>
    {#if reporterRows.length}
      <div class="matrix" style:--cols={weeks.length}>
        <div class="corner"></div>
        {#each weeks as w (w)}<div class="colhead">{fmtDayShort(w)}</div>{/each}
        {#each reporterRows as r (r.id)}
          <div class="rowhead">{r.name}</div>
          {#each r.counts as n, i (i)}
            <div class="cell {shade(n)}" title="{r.name}, week of {fmtDayShort(weeks[i])}: {n} submission{n === 1 ? '' : 's'}">{n || ''}</div>
          {/each}
        {/each}
      </div>
    {:else}
      <EmptyState text="No named submissions in these weeks." />
    {/if}
  </section>

  <section class="card block">
    <h2>Program coverage</h2>
    <p class="sub">Share of each week covered by at least one report. Blank weeks may be school breaks or missing reports.</p>
    <div class="matrix" style:--cols={weeks.length}>
      <div class="corner"></div>
      {#each weeks as w (w)}<div class="colhead">{fmtDayShort(w)}</div>{/each}
      {#each streamRows as r (r.label)}
        <div class="rowhead">{r.label}</div>
        {#each r.cells as f, i (i)}
          <div class="cell {cover(f)}" title="{r.label}, week of {fmtDayShort(weeks[i])}: {Math.round(f * 7)} of 7 days covered"></div>
        {/each}
      {/each}
    </div>
  </section>

  <div class="block">
    <ChartCard title="Programs reporting, day by day" subtitle="Each square is a day. Darker means more programs reported that day." legend={calendar.legend} table={calendar.table} empty={calendar.empty}>
      <EChart option={calendar.option} height={170} label={calendar.summary} />
    </ChartCard>
  </div>

  <div class="grid two">
    <section class="card block">
      <h2>How quickly reports arrive</h2>
      <p class="sub">Days between the end of the reported period and the submission.</p>
      <div class="bars">
        {#each lag as b (b.label)}
          <div class="barrow">
            <span class="bl">{b.label}</span>
            <span class="track"><span class="fill" style:width="{(b.n / lagMax) * 100}%"></span></span>
            <span class="num bn">{fmtInt(b.n)}</span>
          </div>
        {/each}
      </div>
    </section>
    <section class="card block">
      <h2>Form columns</h2>
      {#if ops.unmappedColumns.length}
        <p class="sub">These columns aren't used by the dashboard. If a question was renamed in the form, update <code>shared/headers.ts</code>.</p>
        <ul class="cols">{#each ops.unmappedColumns as c (c)}<li>{c}</li>{/each}</ul>
      {:else}
        <p class="ok"><Icon name="check" size={16} /> Every column in the responses tab is understood.</p>
      {/if}
    </section>
  </div>

  <section class="card block">
    <div class="issues-head">
      <div>
        <h2>Rows to check</h2>
        <p class="sub">Fix these in the Google Sheet; the dashboard picks up changes within about 5 minutes.</p>
      </div>
      <select class="input" aria-label="Filter by type" bind:value={typeFilter}>
        <option value="all">All types ({ops.issues.length})</option>
        {#each typeCounts as [t, n] (t)}<option value={t}>{LABELS[t]} ({n})</option>{/each}
      </select>
    </div>
    {#if issues.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-wrap" tabindex="0" role="region" aria-label="Rows to check">
        <table>
          <thead><tr><th>Row</th><th>What</th><th>Program</th><th>Reported by</th><th>Detail</th></tr></thead>
          <tbody>
            {#each issues as i, k (k)}
              {@const link = rowLink(i.row)}
              <tr class:excluded={i.excluded}>
                <td class="num">
                  {#if link}<a href={link} target="_blank" rel="noopener noreferrer">{i.row} <Icon name="external" size={12} /></a>{:else}{i.row ?? '–'}{/if}
                </td>
                <td><span class="badge {i.excluded ? 'crit' : 'warn'}">{LABELS[i.type]}</span></td>
                <td>{i.metric ? METRIC_BY_ID[i.metric].label : '–'}</td>
                <td>{i.reporter ? (names.get(i.reporter) ?? '–') : '–'}</td>
                <td class="detail">{i.detail}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <EmptyState icon="check" text="Nothing to check." />
    {/if}
  </section>
{/if}

<style>
  .block {
    margin-top: 16px;
  }
  .sub {
    margin: 2px 0 12px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .matrix {
    display: grid;
    grid-template-columns: minmax(120px, 180px) repeat(var(--cols), minmax(26px, 1fr));
    gap: 3px;
    overflow-x: auto;
    font-size: 12px;
  }
  .colhead {
    color: var(--ink-3);
    font-size: 11px;
    text-align: center;
    white-space: nowrap;
  }
  .rowhead {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 6px;
    align-self: center;
  }
  .cell {
    height: 24px;
    border-radius: 5px;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
  }
  .cell.empty {
    border: 1px dashed var(--hairline-strong);
  }
  .cell.l1 {
    background: var(--ramp-2);
  }
  .cell.l2 {
    background: var(--ramp-3);
  }
  .cell.l3 {
    background: var(--ramp-5);
    color: #fff;
  }
  .bars {
    display: grid;
    gap: 8px;
  }
  .barrow {
    display: grid;
    grid-template-columns: 80px 1fr 40px;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }
  .track {
    height: 12px;
    background: var(--card-2);
    border-radius: 6px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--series-3);
    border-radius: 6px;
  }
  .bn {
    text-align: right;
  }
  .cols {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }
  .ok {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--good);
  }
  .issues-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .table-wrap {
    max-height: 480px;
    overflow: auto;
    border: 1px solid var(--hairline);
    border-radius: 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    text-align: left;
    padding: 7px 10px;
    border-bottom: 1px solid var(--hairline);
    vertical-align: top;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--card-2);
  }
  td.detail {
    color: var(--ink-2);
    min-width: 240px;
  }
  tr.excluded td {
    background: color-mix(in srgb, var(--crit-bg) 40%, transparent);
  }
  code {
    font-size: 12px;
  }
</style>
