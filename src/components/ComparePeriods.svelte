<script lang="ts">
  // "Compare the last 4 weeks with the 4 weeks before": two periods side by side for the
  // page's measures, in one small table. Every change is shown when both periods have
  // figures, with school breaks explained. Nothing is drawn on the charts.
  import { dayToIso, fmtDay, fmtDayShort, fmtRange, isoToDay } from '../../shared/dates';
  import { ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID, STAFF_MEALS, TEACHING_METRICS } from '../../shared/metrics';
  import type { MetricId } from '../../shared/types';
  import { FOCUS_CHOICES, lengthText, type CompareMode, type Focus } from '../lib/compare';
  import type { SeriesKey } from '../lib/dataset';
  import { fmtInt, fmtPct } from '../lib/format';
  import { changeTone, periodChange, thinNote } from '../lib/highlights';
  import { breakNote } from '../lib/series';
  import { app, type PageId } from '../lib/state.svelte';
  import { basisNote } from '../lib/teaching';
  import Icon from './Icon.svelte';

  type Row = { label: string; metrics: SeriesKey[] };
  const one = (id: MetricId, label = METRIC_BY_ID[id].short): Row => ({ label, metrics: [id] });
  const ROWS: Partial<Record<PageId, Row[]>> = {
    overview: [
      { label: 'School meals', metrics: MEAL_SCHOOLS },
      one('library_visits', 'Library visits'),
      one('books_checked_out', 'Books checked out'),
      { label: 'Teaching contact hours', metrics: TEACHING_METRICS },
      { label: 'Program attendances', metrics: ENRICHMENT },
    ],
    meals: [{ label: 'School meals (3 schools)', metrics: MEAL_SCHOOLS }, ...MEAL_SCHOOLS.map((id) => one(id)), one(STAFF_MEALS[0], 'Staff & tailoring')],
    library: [one('library_visits', 'Library visits'), one('books_checked_out', 'Books checked out'), one('library_lessons', 'Library lessons')],
    mentorship: [{ label: 'Teaching contact hours', metrics: TEACHING_METRICS }, one('contact_classroom', 'In classrooms'), one('contact_mentorship', 'In mentoring sessions')],
    programs: [{ label: 'Program attendances', metrics: ENRICHMENT }, ...ENRICHMENT.map((id) => one(id)), one('agronomy_workshops', 'Agronomy workshops')],
  };
  const TONE = { up: 'good', down: 'crit', same: 'neutral' } as const;

  const ds = $derived(app.data!);
  const c = $derived(app.comparison);
  const focusChoices = $derived(FOCUS_CHOICES.filter((f) => f.id !== 'term' || ds.terms.length));
  const rows = $derived(c ? (ROWS[app.page] ?? []).map((r) => ({ ...r, ...periodChange(ds, r.metrics, [c.a.from, c.a.to], [c.b.from, c.b.to], !c.sameLength) })) : []);
  const short = (from: number, to: number) => (from === to ? fmtDayShort(from) : `${fmtDayShort(from)} – ${fmtDayShort(to)}`);
  const notes = $derived.by(() => {
    if (!c) return [];
    const out = [breakNote(fmtRange(c.a.from, c.a.to), c.a.from, c.a.to, ds.terms), breakNote(fmtRange(c.b.from, c.b.to), c.b.from, c.b.to, ds.terms)].filter((n): n is string => !!n);
    if (!c.sameLength) out.push('The periods are different lengths, so the changes compare daily averages.');
    if (c.b.from < ds.firstDay) out.push(`Figures start ${fmtDay(ds.firstDay)}.`);
    for (const r of rows) {
      const thin = thinNote(r, 'in the first period', 'in the second period');
      if (thin) out.push(`${r.label}: ${thin}.`);
    }
    if (rows.some((r) => r.basis === 'classroom')) out.push(basisNote('classroom'));
    return out;
  });

  function setDates(which: 'a' | 'b', end: 0 | 1, value: string) {
    const d = isoToDay(value);
    if (!Number.isFinite(d) || !c) return;
    const p: [number, number] = which === 'a' ? [c.a.from, c.a.to] : [c.b.from, c.b.to];
    p[end] = d;
    const next: [number, number] = [Math.min(...p), Math.max(...p)];
    if (which === 'a') app.customA = next;
    else app.customB = next;
  }
</script>

{#if c}
  <section class="card compare" aria-labelledby="compare-title">
    <header>
      <h2 id="compare-title">Compare two periods</h2>
      <button class="btn ghost icon" aria-label="Close the comparison" onclick={() => app.setCompare('none')}><Icon name="x" size={18} /></button>
    </header>
    <div class="sentence">
      <span>Compare</span>
      <select class="input" aria-label="First period" value={app.focus} onchange={(e) => app.setFocus(e.currentTarget.value as Focus)}>
        {#each focusChoices as f (f.id)}<option value={f.id}>{f.label}</option>{/each}
      </select>
      {#if app.focus === 'custom'}
        <input class="input" type="date" aria-label="First period starts" value={dayToIso(c.a.from)} onchange={(e) => setDates('a', 0, e.currentTarget.value)} />
        <span>to</span>
        <input class="input" type="date" aria-label="First period ends" value={dayToIso(c.a.to)} onchange={(e) => setDates('a', 1, e.currentTarget.value)} />
      {/if}
      <span>with</span>
      <select class="input" aria-label="Second period" value={app.compare} onchange={(e) => app.setCompare(e.currentTarget.value as CompareMode)}>
        <option value="prev">The {lengthText(c.a.days)} before</option>
        <option value="yoy">The same dates last year</option>
        <option value="custom">Other dates</option>
      </select>
      {#if app.compare === 'custom'}
        <input class="input" type="date" aria-label="Second period starts" value={dayToIso(c.b.from)} onchange={(e) => setDates('b', 0, e.currentTarget.value)} />
        <span>to</span>
        <input class="input" type="date" aria-label="Second period ends" value={dayToIso(c.b.to)} onchange={(e) => setDates('b', 1, e.currentTarget.value)} />
      {/if}
    </div>
    <p class="dates">{fmtRange(c.a.from, c.a.to)} ({lengthText(c.a.days)}) compared with {fmtRange(c.b.from, c.b.to)} ({lengthText(c.b.days)})</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col" class="num">{short(c.a.from, c.a.to)}</th>
            <th scope="col" class="num">{short(c.b.from, c.b.to)}</th>
            <th scope="col" class="num">Change</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.label)}
            <tr>
              <th scope="row">{r.label}</th>
              <td class="num">{fmtInt(r.a)}</td>
              <td class="num">{fmtInt(r.b)}</td>
              <td class="num">
                {#if r.basis === 'new'}<span class="badge neutral">new measure</span>
                {:else if r.change !== null}<span class="badge {TONE[changeTone(r.change)]}">{fmtPct(r.change)}</span>
                {:else if r.a !== null}<span class="badge neutral">no figures to compare</span>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if notes.length}
      <ul class="notes">
        {#each notes as n (n)}<li><Icon name="info" size={15} /><span>{n}</span></li>{/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .compare {
    margin-bottom: 16px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .sentence {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 10px;
    margin-top: 10px;
    font-size: 15px;
  }
  .sentence .input {
    height: 40px;
    font-size: 15px;
  }
  .dates {
    margin: 10px 0 0;
    font-size: 14px;
    color: var(--ink-3);
  }
  .table-wrap {
    overflow-x: auto;
    margin-top: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid var(--rule);
    text-align: left;
  }
  thead th {
    font-size: 13px;
    color: var(--ink-3);
    font-weight: 700;
  }
  tbody th {
    font-weight: 600;
  }
  .num {
    text-align: right;
    white-space: nowrap;
  }
  .badge {
    font-size: 13px;
  }
  .notes {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: grid;
    gap: 6px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .notes li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .notes :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--ink-3);
  }
  @media (max-width: 520px) {
    th,
    td {
      padding: 8px 6px;
      font-size: 14px;
    }
  }
</style>
