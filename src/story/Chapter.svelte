<script lang="ts" module>
  export type Tone = 'sun' | 'water' | 'leaf' | 'coral' | 'teal' | 'earth';
</script>

<script lang="ts">
  // One program chapter of the story: a tinted band with a numbered kicker, a condensed
  // headline, the program's description beside a photo, then that program's numbers.
  import type { Snippet } from 'svelte';
  import type { Photo as PhotoData } from '../content';
  import Photo from '../components/Photo.svelte';

  interface Props {
    id: string;
    n: string;
    kicker: string;
    title: string;
    tone: Tone;
    photo: PhotoData;
    flip?: boolean;
    intro: Snippet;
    children?: Snippet;
  }
  let { id, n, kicker, title, tone, photo, flip = false, intro, children }: Props = $props();
</script>

<section {id} class="chapter" style:--tint="var(--{tone}-tint)" style:--deep="var(--{tone}-deep)" style:--bright="var(--{tone})" aria-labelledby="{id}-title">
  <div class="wrap">
    <div class="intro" class:flip>
      <div class="text">
        <p class="kicker"><span class="n">{n}</span>{kicker}</p>
        <h2 id="{id}-title" class="display">{title}</h2>
        {@render intro()}
      </div>
      <div class="pic">
        <Photo {photo} ratio="4 / 3" sizes="(max-width: 900px) 100vw, 620px" />
      </div>
    </div>
    {@render children?.()}
  </div>
</section>

<style>
  .chapter {
    background: var(--tint);
    padding: clamp(48px, 7vw, 96px) 0;
  }
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: clamp(28px, 5vw, 72px);
    align-items: center;
  }
  .intro.flip .text {
    order: 2;
  }
  .kicker {
    color: var(--deep);
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .n {
    font-size: 13px;
    padding-right: 12px;
    border-right: 2px solid var(--bright);
  }
  h2 {
    font-size: clamp(36px, 5vw, 60px);
    margin-bottom: 22px;
    text-wrap: balance;
  }
  .text :global(p.body) {
    font-size: 18px;
    line-height: 1.6;
    color: var(--ink-2);
    margin: 0 0 14px;
    max-width: 38em;
  }
  @media (max-width: 900px) {
    .intro {
      grid-template-columns: 1fr;
    }
    .intro.flip .text {
      order: 0;
    }
    .text :global(p.body) {
      font-size: 17px;
    }
  }
</style>
