<script lang="ts">
  // The top of each dashboard page: highlights for the latest full week and month and the
  // year so far. They sit above the chart dates and don't change with them. Figures only:
  // checks on the reports themselves are on Data health.
  import { ENRICHMENT, MEAL_SCHOOLS, METRIC_BY_ID, STAFF_MEALS, TEACHING_METRICS } from '../../shared/metrics';
  import type { MetricId } from '../../shared/types';
  import { schoolKey, type SeriesKey } from '../lib/dataset';
  import type { HighlightRow } from '../lib/highlights';
  import { milestones } from '../lib/insights';
  import { app, type PageId } from '../lib/state.svelte';
  import HighlightCards from './HighlightCards.svelte';
  import Highlights from './Highlights.svelte';
  import Icon from './Icon.svelte';

  const one = (id: MetricId, label = METRIC_BY_ID[id].short): HighlightRow => ({ label, metrics: [id] });

  /** Each program page leads with its main measure. */
  const MAIN: Partial<Record<PageId, { metrics: SeriesKey[]; unit: string }>> = {
    meals: { metrics: MEAL_SCHOOLS, unit: 'school meals' },
    library: { metrics: ['library_visits'], unit: 'library visits' },
    mentorship: { metrics: TEACHING_METRICS, unit: 'teaching contact hours' },
    programs: { metrics: ENRICHMENT, unit: 'program attendances' },
  };

  const ds = $derived(app.data!);
  const main = $derived(MAIN[app.page] ?? null);
  const detail = $derived.by((): { heading?: string; rows: HighlightRow[] } => {
    switch (app.page) {
      case 'overview':
        return {
          rows: [
            { label: 'School meals', metrics: MEAL_SCHOOLS, page: 'meals' },
            { label: 'Library visits', metrics: ['library_visits'], page: 'library' },
            { label: 'Books checked out', metrics: ['books_checked_out'], page: 'library' },
            { label: 'Teaching contact hours', metrics: TEACHING_METRICS, page: 'mentorship' },
            { label: 'Program attendances', metrics: ENRICHMENT, page: 'programs' },
          ],
        };
      case 'meals':
        return { heading: 'By school', rows: [...MEAL_SCHOOLS.map((m) => one(m)), { label: 'Staff & tailoring (not in the meals count)', metrics: STAFF_MEALS }] };
      case 'library':
        return { heading: 'Books and lessons', rows: [one('books_checked_out', 'Books checked out'), one('library_lessons', 'Library lessons')] };
      case 'mentorship':
        return {
          heading: 'Teaching contact hours in detail',
          rows: [
            one('contact_classroom', 'In classrooms'),
            one('contact_mentorship', 'In mentoring sessions'),
            ...ds.schools.map((s) => ({ label: s.label, metrics: TEACHING_METRICS.map((m) => schoolKey(m, s.label)) })),
          ],
        };
      case 'programs':
        return { heading: 'By program', rows: [...ENRICHMENT.map((m) => one(m)), one('agronomy_workshops', 'Agronomy workshops')] };
      default:
        return { rows: [] };
    }
  });
  const marks = $derived(app.page === 'overview' ? milestones(ds) : []);
</script>

{#if main || detail.rows.length}
  <section class="highlights" aria-labelledby="highlights-title">
    <div class="intro">
      <h2 id="highlights-title">Highlights</h2>
      <p>The latest full week and month, and the year so far. Changing the chart dates doesn't change these.</p>
    </div>
    {#if main}<HighlightCards metrics={main.metrics} unit={main.unit} />{/if}
    {#if detail.rows.length}
      <div class:gap={!!main}><Highlights rows={detail.rows} heading={detail.heading} notes={!main} /></div>
    {/if}
    {#if marks.length}
      <ul class="marks">
        {#each marks as m (m.key)}<li><Icon name="spark" size={16} />{m.text}</li>{/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .highlights {
    margin-bottom: 22px;
  }
  .intro {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin-bottom: 10px;
  }
  h2 {
    font-size: 20px;
  }
  .intro p {
    margin: 0;
    font-size: 14px;
    color: var(--ink-3);
  }
  .gap {
    margin-top: 16px;
  }
  .marks {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 20px;
    font-size: 14px;
    color: var(--good);
    font-weight: 600;
  }
  .marks li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
