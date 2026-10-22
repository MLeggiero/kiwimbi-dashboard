<script lang="ts">
  import Icon from './Icon.svelte';
  import Sparkline from './Sparkline.svelte';
  import { fmtInt, fmtPct } from '../lib/format';

  interface Props {
    label: string;
    value: number | null;
    format?: (v: number | null) => string;
    sub?: string;
    /** Fractional change vs the comparison period; null = not enough data to compare. */
    delta?: number | null;
    /** Shown when a comparison is active, e.g. "vs last year". */
    deltaLabel?: string;
    spark?: (number | null)[];
    color?: string;
  }
  let { label, value, format = fmtInt, sub, delta = null, deltaLabel = '', spark, color = 'var(--series-1)' }: Props = $props();
</script>

<div class="card tile">
  <div class="label">
    <span class="swatch" style:background={color}></span>{label}
  </div>
  <div class="value">{format(value)}</div>
  {#if sub}<div class="sub">{sub}</div>{/if}
  <div class="foot">
    {#if deltaLabel}
      {#if delta === null}
        <span class="badge neutral" title="Not enough reports in the comparison period to compare fairly">No comparison</span>
      {:else}
        <span class="badge {delta >= 0 ? 'good' : 'crit'}">
          <Icon name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={12} />{fmtPct(delta)}
          <span class="vs">{deltaLabel}</span>
        </span>
      {/if}
    {:else}
      <span></span>
    {/if}
    {#if spark}<Sparkline values={spark} {color} />{/if}
  </div>
</div>

<style>
  .tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px 18px 12px;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }
  .value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 4px;
  }
  .sub {
    font-size: 12px;
    color: var(--ink-3);
  }
  .foot {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
    min-height: 28px;
  }
  .vs {
    font-weight: 400;
    opacity: 0.85;
  }
</style>
