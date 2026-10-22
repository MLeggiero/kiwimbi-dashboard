<script lang="ts">
  import { buildColumns } from '../charts/story';
  import EChart from '../components/EChart.svelte';
  import { PHOTOS, PROGRAM_COPY, PROGRAMS } from '../content';
  import type { Dataset } from '../lib/dataset';
  import { fmtInt, plural } from '../lib/format';
  import { autoGranularity } from '../lib/series';
  import type { Story } from '../lib/story';
  import type { ChartTheme } from '../lib/theme.svelte';
  import Chapter from './Chapter.svelte';

  let { story, ds, theme }: { story: Story; ds: Dataset; theme: ChartTheme } = $props();
  const p = $derived(story.period);
  const word = $derived(autoGranularity(p.from, p.to) === 'week' ? 'week' : 'month');
  // Pebble colors, and the matching chart color (theme.series index) for each program.
  const COLORS = ['var(--coral)', 'var(--earth)', 'var(--sun)', 'var(--leaf)', 'var(--water)', 'var(--teal)', 'var(--coral)'];
  const SERIES = [5, 1, 3, 0, 2, 4, 5];
  const SHAPES = ['58% 42% 52% 48% / 46% 54% 46% 54%', '44% 56% 60% 40% / 55% 42% 58% 45%', '52% 48% 40% 60% / 42% 58% 44% 56%', '60% 40% 48% 52% / 50% 46% 54% 50%'];
  const rows = $derived(
    PROGRAM_COPY.map((c, i) => {
      const stat = story.programs.find((x) => x.id === c.metric);
      const chart = stat?.total ? buildColumns({ ds, period: p, theme, series: [{ name: c.name, color: theme.series[SERIES[i % SERIES.length]], metrics: [c.metric] }], unit: 'attendances', average: false }) : null;
      return { ...c, stat, chart, color: COLORS[i % COLORS.length], shape: SHAPES[i % SHAPES.length] };
    }),
  );
</script>

<Chapter id="programs" n="04" kicker={PROGRAMS.kicker} title={PROGRAMS.title} tone="coral" photo={PHOTOS.tailoring} flip>
  {#snippet intro()}
    <p class="body">{PROGRAMS.body}</p>
  {/snippet}

  <ul class="list">
    {#each rows as r (r.metric)}
      <li class="prog">
        {#if r.photo}
          <img class="pebble" src={r.photo.src} srcset={r.photo.srcset} sizes="112px" alt={r.photo.alt} loading="lazy" decoding="async" referrerpolicy="no-referrer" style:border-radius={r.shape} style:object-position={r.photo.focus ?? '50% 50%'} />
        {:else}
          <span class="pebble blank" style:border-radius={r.shape} style:background={r.color} aria-hidden="true">{r.name[0]}</span>
        {/if}
        <div class="text">
          <h3>{r.name}</h3>
          <p>{r.text}</p>
          {#if r.stat && r.stat.total !== null}
            <p class="nums">
              <strong class="num">{fmtInt(r.stat.total)}</strong> attendances{#if r.stat.typical}<span class="sep">·</span>about <strong class="num">{fmtInt(r.stat.typical)}</strong> a week{/if}{#if r.metric === 'agronomy_attendees' && story.workshops}<span class="sep">·</span>{plural(story.workshops, 'workshop')}{/if}
            </p>
          {:else}
            <p class="nums none">None reported for these dates.</p>
          {/if}
        </div>
        {#if r.chart && !r.chart.empty}
          <div class="chart">
            <p class="cap">Attendances each {word}</p>
            <EChart option={r.chart.option} height={150} label="{r.name}: {r.chart.summary}" />
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</Chapter>

<style>
  .list {
    list-style: none;
    margin: clamp(44px, 5.5vw, 72px) 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 44px clamp(32px, 4vw, 64px);
  }
  .prog {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 0 20px;
    align-content: start;
    align-items: start;
    padding-top: 20px;
    border-top: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
    min-width: 0;
  }
  .pebble {
    width: 112px;
    height: 112px;
    object-fit: cover;
    display: block;
  }
  .pebble.blank {
    display: grid;
    place-items: center;
    font-size: 52px;
    font-weight: 800;
    font-stretch: 75%;
    color: #1c2420;
  }
  h3 {
    font-size: 26px;
    margin-bottom: 6px;
  }
  .text {
    min-width: 0;
  }
  .text p {
    margin: 0 0 10px;
    font-size: 15px;
    line-height: 1.55;
    color: var(--ink-2);
  }
  .text p.nums {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
  }
  .text p.none {
    color: var(--ink-3);
  }
  .sep {
    margin: 0 6px;
    color: var(--ink-3);
  }
  /* The chart runs the full width of the program, under the photo and the text. */
  .chart {
    grid-column: 1 / -1;
    min-width: 0;
    margin-top: 16px;
  }
  .cap {
    margin: 0 0 2px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  @media (max-width: 900px) {
    .list {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 480px) {
    .prog {
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 0 14px;
    }
    .pebble {
      width: 76px;
      height: 76px;
    }
    .pebble.blank {
      font-size: 36px;
    }
    h3 {
      font-size: 22px;
    }
  }
</style>
