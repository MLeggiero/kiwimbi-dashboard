<script lang="ts">
  // The impact story: what everyone signed in sees. Short program descriptions, photos and
  // a few clear numbers for whatever range the timeline selects. No report counts or data
  // checks (those are in the managers' view), and no staff or tailoring meals.
  import { buildStory } from '../lib/story';
  import type { PrintTarget } from '../lib/print';
  import { app } from '../lib/state.svelte';
  import { readChartTheme, themeState } from '../lib/theme.svelte';
  import Glance from './Glance.svelte';
  import Hero from './Hero.svelte';
  import HowWeCount from './HowWeCount.svelte';
  import LibraryChapter from './LibraryChapter.svelte';
  import MealsChapter from './MealsChapter.svelte';
  import MentoringChapter from './MentoringChapter.svelte';
  import ProgramsChapter from './ProgramsChapter.svelte';
  import StoryFooter from './StoryFooter.svelte';

  let { onprint }: { onprint: (target: PrintTarget) => void } = $props();

  const ds = $derived(app.data!);
  const story = $derived(buildStory(ds, app.activePreset, app.range[0], app.range[1]));
  const theme = $derived.by(() => {
    void themeState.version;
    return readChartTheme();
  });
</script>

<main class="story" class:dim={app.refreshing} aria-busy={app.refreshing}>
  <Hero {story} />
  <Glance {story} />
  <HowWeCount />
  <MealsChapter {story} {ds} {theme} />
  <LibraryChapter {story} {ds} {theme} />
  <MentoringChapter {story} {ds} {theme} />
  <ProgramsChapter {story} {ds} {theme} />
</main>
<StoryFooter {onprint} />
