<script lang="ts">
  // A single ratio against a scale. Track and fill are steps of the same leaf ramp.
  import { fmtOne } from '../lib/format';

  let { value, max = 1.5, label, unit = '' }: { value: number | null; max?: number; label: string; unit?: string } = $props();
  const pct = $derived(value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100)));
</script>

<div class="meter">
  <div class="big">{fmtOne(value)}<span class="unit">{unit}</span></div>
  <div class="track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value ?? 0}>
    <div class="fill" style:width="{pct}%"></div>
  </div>
  <div class="scale num"><span>0</span><span>{fmtOne(max / 2)}</span><span>{fmtOne(max)}</span></div>
</div>

<style>
  .big {
    font-size: 40px;
    font-weight: 700;
    line-height: 1.1;
  }
  .unit {
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
    margin-left: 6px;
  }
  .track {
    height: 12px;
    border-radius: 6px;
    background: var(--ramp-1);
    margin-top: 14px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 6px;
    background: var(--ramp-4);
    transition: width 0.5s ease;
  }
  .scale {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--ink-3);
    margin-top: 4px;
  }
</style>
