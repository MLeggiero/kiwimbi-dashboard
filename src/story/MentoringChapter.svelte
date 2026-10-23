<script lang="ts">
  import { estimatedColor } from '../charts/common';
  import { buildColumns } from '../charts/story';
  import EChart from '../components/EChart.svelte';
  import { MENTORING, PHOTOS } from '../content';
  import { reportedKey, type Dataset } from '../lib/dataset';
  import { fmtInt } from '../lib/format';
  import { autoGranularity } from '../lib/series';
  import type { Story } from '../lib/story';
  import { EST_CLASSROOM } from '../lib/teaching';
  import type { ChartTheme } from '../lib/theme.svelte';
  import Chapter from './Chapter.svelte';
  import Stat from './Stat.svelte';

  let { story, ds, theme }: { story: Story; ds: Dataset; theme: ChartTheme } = $props();
  const p = $derived(story.period);
  const word = $derived(autoGranularity(p.from, p.to) === 'week' ? 'week' : 'month');
  const classroomColor = $derived(theme.series[0]);
  const mentorshipColor = $derived(theme.series[4]);
  const estColor = $derived(estimatedColor(classroomColor, theme));
  const chart = $derived(
    buildColumns({
      ds,
      period: p,
      theme,
      series: [
        { name: 'Classroom', color: classroomColor, metrics: [reportedKey('contact_classroom')] },
        { name: 'Classroom, estimated from lesson counts', color: estColor, metrics: [EST_CLASSROOM] },
        { name: 'Mentorship', color: mentorshipColor, metrics: ['contact_mentorship'] },
      ],
      unit: 'teaching contact hours',
    }),
  );
</script>

<Chapter id="mentoring" n="03" kicker={MENTORING.kicker} title={MENTORING.title} tone="leaf" photo={PHOTOS.mentoring}>
  {#snippet intro()}
    <p class="body">{MENTORING.body}</p>
  {/snippet}

  {#if story.hours.total !== null}
    <div class="s-pair stats">
      <Stat
        value={fmtInt(story.hours.total)}
        label="teaching contact hours"
        text="{fmtInt(story.classroom)} in classrooms{story.estimated ? ` (${fmtInt(story.estimated)} estimated from lesson counts)` : ''}, {fmtInt(story.mentorship)} in mentoring sessions."
      />
      {#if story.hoursPerWeek}
        <Stat value={fmtInt(story.hoursPerWeek)} label="teaching contact hours in a typical school week" />
      {/if}
    </div>

    {#if !chart.empty}
      <div class="s-block">
        <h3>Teaching contact hours every {word}</h3>
        <p class="s-note">
          <span class="key" style:--c={classroomColor}>Classroom</span>{#if story.estimated}, <span class="key" style:--c={estColor}>estimated from lesson counts</span>,{/if} and <span class="key" style:--c={mentorshipColor}>mentorship</span> hours.
        </p>
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
