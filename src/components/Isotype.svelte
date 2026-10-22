<script lang="ts">
  // "Plates" pictogram: each plate stands for a round number of meals, colored by school.
  import { fmtInt } from '../lib/format';

  let { groups, unit = 'meals' }: { groups: { label: string; value: number; color: string }[]; unit?: string } = $props();
  const uid = $props.id();

  const total = $derived(groups.reduce((a, g) => a + g.value, 0));
  const per = $derived([10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000].find((u) => total / u <= 110) ?? 100000);
  const rows = $derived(groups.filter((g) => g.value > 0).map((g) => ({ ...g, full: Math.floor(g.value / per), part: (g.value % per) / per })));
</script>

<div class="iso">
  <p class="key">
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="var(--ink-3)" opacity="0.25" /><circle cx="10" cy="10" r="5.5" fill="var(--ink-3)" /></svg>
    Each plate = {fmtInt(per)} {unit}
  </p>
  {#each rows as g, gi (g.label)}
    <div class="row">
      <div class="who">
        <span class="dot" style:background={g.color}></span>
        <span class="name">{g.label}</span>
        <span class="num count">{fmtInt(g.value)}</span>
      </div>
      <div class="plates" role="img" aria-label="{g.label}: {fmtInt(g.value)} {unit}, about {Math.round(g.value / per)} plates">
        {#each { length: g.full } as _, i (i)}
          <svg class="plate" style:animation-delay="{Math.min(i, 60) * 10}ms" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="9" fill={g.color} opacity="0.22" />
            <circle cx="10" cy="10" r="5.5" fill={g.color} />
          </svg>
        {/each}
        {#if g.part >= 0.05}
          <svg class="plate" viewBox="0 0 20 20" aria-hidden="true">
            <clipPath id="{uid}-{gi}"><rect width={20 * g.part} height="20" /></clipPath>
            <circle cx="10" cy="10" r="9" fill="none" stroke={g.color} stroke-opacity="0.35" />
            <g clip-path="url(#{uid}-{gi})">
              <circle cx="10" cy="10" r="9" fill={g.color} opacity="0.22" />
              <circle cx="10" cy="10" r="5.5" fill={g.color} />
            </g>
          </svg>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .key {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 6px 0 12px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .row {
    display: grid;
    grid-template-columns: minmax(130px, 170px) 1fr;
    gap: 12px;
    align-items: start;
    padding: 8px 0;
    border-top: 1px solid var(--hairline);
  }
  .who {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .name {
    flex: 1;
  }
  .count {
    color: var(--ink-3);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
  .plates {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .plate {
    width: 18px;
    height: 18px;
    animation: pop 0.4s ease-out backwards;
  }
  @keyframes pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
