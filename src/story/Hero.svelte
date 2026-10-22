<script lang="ts">
  import { MISSION, PHOTOS, SCHOOLS_SENTENCE } from '../content';
  import { fmtInt } from '../lib/format';
  import type { Story } from '../lib/story';

  let { story }: { story: Story } = $props();
  const p = $derived(story.period);
  const meals = $derived(story.meals);
  const when = $derived(p.phrase === 'so far this year' ? 'This year' : `${p.phrase[0].toUpperCase()}${p.phrase.slice(1)}`);
  const photo = PHOTOS.hero;
  let failed = $state(false);
</script>

<section class="hero" aria-labelledby="hero-title">
  <div class="frame" class:failed>
    {#if !failed}
      <img src={photo.src} srcset={photo.srcset} sizes="100vw" alt={photo.alt} style:object-position={photo.focus} fetchpriority="high" referrerpolicy="no-referrer" onerror={() => (failed = true)} />
    {/if}
    <p class="credit">{photo.caption} Photo © Kiwimbi</p>
  </div>
  <div class="wrap">
    <div class="panel">
      {#if meals.total !== null}
        <p class="kicker">School lunches · {p.label}</p>
        <h1 id="hero-title" class="display"><span class="big num">{fmtInt(meals.total)}</span> lunches served</h1>
        <p class="lede">
          {when}, at {SCHOOLS_SENTENCE}{#if meals.perSchoolDay}: about <strong>{fmtInt(meals.perSchoolDay)}</strong> a school day{/if}.
        </p>
      {:else}
        <p class="kicker">Kiwimbi · {p.label}</p>
        <h1 id="hero-title" class="display">Opportunity through education</h1>
        <p class="lede">No lunches reported {p.phrase}. Kiwimbi works in {MISSION.region}.</p>
      {/if}
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding-bottom: clamp(32px, 5vw, 64px);
  }
  .frame {
    position: relative;
    height: clamp(340px, 64vh, 660px);
    overflow: hidden;
    background: var(--lake-2);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .credit {
    position: absolute;
    right: 12px;
    bottom: 8px;
    margin: 0;
    padding: 2px 8px;
    font-size: 12px;
    color: #fff;
    background: rgba(0, 0, 0, 0.45);
    border-radius: 2px;
  }
  .panel {
    position: relative;
    margin-top: -190px;
    max-width: 780px;
    padding: 30px clamp(22px, 4vw, 44px) 36px;
    background: var(--lake);
    color: var(--on-lake);
  }
  .kicker {
    color: var(--sun);
  }
  h1 {
    color: var(--on-lake);
    font-size: clamp(34px, 4.6vw, 58px);
    text-wrap: balance;
  }
  .big {
    display: block;
    color: var(--sun);
    font-size: clamp(72px, 11vw, 140px);
    line-height: 0.9;
    letter-spacing: -0.03em;
  }
  .lede {
    margin: 18px 0 0;
    font-size: clamp(17px, 1.6vw, 20px);
    line-height: 1.55;
    color: var(--on-lake);
    max-width: 36em;
  }
  .lede strong {
    color: var(--sun);
  }
  @media (max-width: 700px) {
    .frame {
      height: clamp(260px, 52vh, 420px);
    }
    .panel {
      margin-top: -56px;
      margin-left: calc(var(--gutter) * -1);
      margin-right: calc(var(--gutter) * -1);
    }
    .credit {
      bottom: 64px;
    }
  }
</style>
