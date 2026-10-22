<script lang="ts">
  import { MEAL_SCHOOLS } from '../../shared/metrics';
  import { buildColumns, buildRace } from '../charts/story';
  import EChart from '../components/EChart.svelte';
  import Isotype from '../components/Isotype.svelte';
  import { MEALS, PHOTOS } from '../content';
  import type { Dataset } from '../lib/dataset';
  import { fmtInt } from '../lib/format';
  import { autoGranularity } from '../lib/series';
  import type { Story } from '../lib/story';
  import type { ChartTheme } from '../lib/theme.svelte';
  import Chapter from './Chapter.svelte';

  let { story, ds, theme }: { story: Story; ds: Dataset; theme: ChartTheme } = $props();
  const p = $derived(story.period);
  const word = $derived(autoGranularity(p.from, p.to) === 'week' ? 'week' : 'month');
  const color = $derived(theme.series[1]);
  const weekly = $derived(buildColumns({ ds, period: p, theme, series: [{ name: 'Lunches', color, metrics: MEAL_SCHOOLS }], unit: 'lunches' }));
  const race = $derived(buildRace({ ds, period: p, theme, metrics: MEAL_SCHOOLS, color, unit: 'lunches' }));
  const parts = $derived(story.schools.map((s, i) => ({ label: s.label, value: s.value, color: [theme.series[1], theme.series[3], theme.series[4]][i] })));
</script>

<Chapter id="lunches" n="01" kicker={MEALS.kicker} title={MEALS.title} tone="sun" photo={PHOTOS.lunch}>
  {#snippet intro()}
    <p class="body">{MEALS.body}</p>
  {/snippet}

  {#if story.meals.total !== null && !weekly.empty}
    <div class="s-block">
      <h3>Every {word}</h3>
      <p class="s-note">Lunches at the three schools. Gaps are breaks or {word}s not yet reported.</p>
      <EChart option={weekly.option} height={280} label={weekly.summary} />
    </div>
    <div class="s-pair">
      <div class="s-block">
        <h3>At each school</h3>
        <Isotype groups={parts} unit="lunches" />
      </div>
      {#if race}
        <div class="s-block">
          <h3>Adding up</h3>
          <p class="s-note">Running total of lunches, week by week.</p>
          <EChart option={race.option} height={280} label={race.summary} />
        </div>
      {/if}
    </div>
  {/if}
</Chapter>
