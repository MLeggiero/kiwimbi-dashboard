<script lang="ts">
  // Under the highlights: the rhythm of the year for the chosen dates, one square a day.
  import { MEAL_SCHOOLS, TEACHING_METRICS } from '../../shared/metrics';
  import type { MetricId } from '../../shared/types';
  import { buildCalendar } from '../charts/calendar';
  import ChartCard from '../components/ChartCard.svelte';
  import EChart from '../components/EChart.svelte';
  import { currentView } from '../lib/current.svelte';

  const ctx = $derived.by(currentView);

  let calChoice = $state<'meals' | 'library' | 'hours'>('meals');
  const CAL: Record<'meals' | 'library' | 'hours', { metrics: MetricId[]; unit: string }> = {
    meals: { metrics: MEAL_SCHOOLS, unit: 'school meals' },
    library: { metrics: ['library_visits'], unit: 'library visits' },
    hours: { metrics: TEACHING_METRICS, unit: 'teaching contact hours' },
  };
  const calendar = $derived(buildCalendar(ctx, CAL[calChoice]));
</script>

<ChartCard title="Year in activity" subtitle="Each square is a day. Darker means more {CAL[calChoice].unit}." legend={calendar.legend} table={calendar.table} empty={calendar.empty}>
  {#snippet controls()}
    <select class="input" aria-label="What the calendar shows" bind:value={calChoice}>
      <option value="meals">School meals</option>
      <option value="library">Library visits</option>
      <option value="hours">Teaching contact hours</option>
    </select>
  {/snippet}
  <EChart option={calendar.option} height={170} label={calendar.summary} />
</ChartCard>
