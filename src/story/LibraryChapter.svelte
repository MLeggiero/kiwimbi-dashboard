<script lang="ts">
  import { buildColumns } from '../charts/story';
  import Bookshelf from '../components/Bookshelf.svelte';
  import EChart from '../components/EChart.svelte';
  import { LIBRARY, PHOTOS } from '../content';
  import type { Dataset } from '../lib/dataset';
  import { fmtInt, fmtOne } from '../lib/format';
  import { autoGranularity } from '../lib/series';
  import type { Story } from '../lib/story';
  import type { ChartTheme } from '../lib/theme.svelte';
  import Chapter from './Chapter.svelte';
  import Stat from './Stat.svelte';

  let { story, ds, theme }: { story: Story; ds: Dataset; theme: ChartTheme } = $props();
  const p = $derived(story.period);
  const word = $derived(autoGranularity(p.from, p.to) === 'week' ? 'week' : 'month');
  const visits = $derived(buildColumns({ ds, period: p, theme, series: [{ name: 'Visits', color: theme.series[2], metrics: ['library_visits'] }], unit: 'visits' }));
  const r = $derived(story.booksPerVisit);
  const ratioText = $derived(r === null || r <= 0 ? '' : r >= 1 ? `${fmtOne(r)} books per visit.` : `One book for every ${Math.round(1 / r)} visits.`);
</script>

<Chapter id="library" n="02" kicker={LIBRARY.kicker} title={LIBRARY.title} tone="water" photo={PHOTOS.reading} flip>
  {#snippet intro()}
    <p class="body">{LIBRARY.body}</p>
  {/snippet}

  {#if story.visits.total !== null || story.books.total !== null}
    <div class="s-pair stats">
      {#if story.visits.total !== null}
        <Stat value={fmtInt(story.visits.total)} label="visits" text="About {fmtInt(story.visits.perSchoolDay)} a school day." />
      {/if}
      {#if story.books.total !== null}
        <Stat value={fmtInt(story.books.total)} label="books borrowed" text={ratioText} />
      {/if}
    </div>
  {/if}

  <div class="s-pair">
    {#if !visits.empty}
      <div class="s-block">
        <h3>Visits every {word}</h3>
        <EChart option={visits.option} height={250} label={visits.summary} />
      </div>
    {/if}
    {#if story.books.total}
      <div class="s-block">
        <h3>Books borrowed</h3>
        <Bookshelf books={story.books.total} label="Books borrowed {p.phrase}" />
      </div>
    {/if}
  </div>
</Chapter>

<style>
  .stats {
    margin-top: clamp(40px, 5vw, 64px);
  }
</style>
