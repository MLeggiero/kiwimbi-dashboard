<script lang="ts">
  import { DATA_NOTICE } from '../content';
  import { fmtAgo, fmtInt, fmtOne } from '../lib/format';
  import { app } from '../lib/state.svelte';
  import type { Story } from '../lib/story';
  import { jumpTo } from './jump';
  import Stat from './Stat.svelte';

  let { story }: { story: Story } = $props();
  const p = $derived(story.period);
  const ds = $derived(app.data!);
  const value = (v: number | null) => (v === null ? '–' : fmtInt(v));
  const none = 'None reported.';

  const mealsText = $derived(story.meals.total === null ? none : `About ${fmtInt(story.meals.perSchoolDay)} a school day.`);
  const visitsText = $derived(story.visits.total === null ? none : `About ${fmtInt(story.visits.perSchoolDay)} a school day.`);
  const booksText = $derived.by(() => {
    const r = story.booksPerVisit;
    if (story.books.total === null) return none;
    return r === null || r <= 0 ? '' : r >= 1 ? `${fmtOne(r)} per visit.` : `One for every ${Math.round(1 / r)} visits.`;
  });
  const classesText = $derived(story.classes.total === null ? none : story.classesPerWeek ? `About ${fmtInt(story.classesPerWeek)} a school week.` : '');
</script>

<section class="glance" aria-labelledby="glance-title">
  <div class="wrap">
    <div class="head">
      <h2 id="glance-title" class="display">{p.label}, at a glance</h2>
      <p>
        {#if app.fetchedAt && p.to >= ds.today - 1}Updated {fmtAgo(app.fetchedAt, app.now)} ·{/if}
        <a href="#notice" onclick={(e) => jumpTo(e, 'notice')}>{DATA_NOTICE.short}</a>
      </p>
    </div>
    <div class="figures">
      <Stat value={value(story.meals.total)} label="lunches served" text={mealsText} color="var(--earth-deep)" rule="var(--sun)" />
      <Stat value={value(story.visits.total)} label="library visits" text={visitsText} color="var(--water-deep)" rule="var(--water)" />
      <Stat value={value(story.books.total)} label="books borrowed" text={booksText} color="var(--coral-deep)" rule="var(--coral)" />
      <Stat value={value(story.classes.total)} label="classes taught" text={classesText} color="var(--leaf-deep)" rule="var(--leaf)" />
    </div>
  </div>
</section>

<style>
  .glance {
    padding: 8px 0 clamp(44px, 6vw, 72px);
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 24px;
    flex-wrap: wrap;
    margin-bottom: 26px;
  }
  h2 {
    font-size: clamp(30px, 3.8vw, 44px);
  }
  .head p {
    margin: 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .head a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--rule);
    text-underline-offset: 3px;
  }
  .figures {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 32px;
  }
  @media (max-width: 1000px) {
    .figures {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 520px) {
    .figures {
      grid-template-columns: 1fr;
      gap: 26px;
    }
  }
</style>
