<script lang="ts">
  import { buildColumns } from '../charts/story';
  import EChart from '../components/EChart.svelte';
  import { MENTORING, PHOTOS } from '../content';
  import type { Dataset } from '../lib/dataset';
  import { fmtInt } from '../lib/format';
  import { autoGranularity } from '../lib/series';
  import type { Story } from '../lib/story';
  import type { ChartTheme } from '../lib/theme.svelte';
  import Chapter from './Chapter.svelte';
  import Stat from './Stat.svelte';

  let { story, ds, theme }: { story: Story; ds: Dataset; theme: ChartTheme } = $props();
  const p = $derived(story.period);
  const word = $derived(autoGranularity(p.from, p.to) === 'week' ? 'week' : 'month');
  const primaryColor = $derived(theme.series[0]);
  const secondaryColor = $derived(theme.series[4]);
  const chart = $derived(
    buildColumns({
      ds,
      period: p,
      theme,
      series: [
        { name: 'Primary schools', color: primaryColor, metrics: ['classes_primary'] },
        { name: 'Secondary schools', color: secondaryColor, metrics: ['classes_secondary'] },
      ],
      unit: 'classes',
    }),
  );
</script>

<Chapter id="mentoring" n="03" kicker={MENTORING.kicker} title={MENTORING.title} tone="leaf" photo={PHOTOS.mentoring}>
  {#snippet intro()}
    <p class="body">{MENTORING.body}</p>
  {/snippet}

  {#if story.classes.total !== null}
    <div class="s-pair stats">
      <Stat value={fmtInt(story.classes.total)} label="classes taught" text="{fmtInt(story.primary)} in primary schools, {fmtInt(story.secondary)} in secondary." />
      {#if story.classesPerWeek}
        <Stat value={fmtInt(story.classesPerWeek)} label="classes in a typical school week" />
      {/if}
    </div>

    {#if !chart.empty}
      <div class="s-block">
        <h3>Classes every {word}</h3>
        <p class="s-note"><span class="key" style:--c={primaryColor}>Primary</span> and <span class="key" style:--c={secondaryColor}>secondary</span> schools.</p>
        <EChart option={chart.option} height={250} label={chart.summary} />
      </div>
    {/if}
  {/if}
</Chapter>

<style>
  .stats {
    margin-top: clamp(40px, 5vw, 64px);
  }
  .key {
    font-weight: 700;
    color: var(--ink);
    white-space: nowrap;
  }
  .key::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 5px;
    border-radius: 1px;
    background: var(--c);
  }
</style>
