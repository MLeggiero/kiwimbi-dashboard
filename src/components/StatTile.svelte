<script lang="ts">
  import { fmtInt } from '../lib/format';

  interface Props {
    label: string;
    value: number | null;
    format?: (v: number | null) => string;
    sub?: string;
    color?: string;
  }
  let { label, value, format = fmtInt, sub, color = 'var(--series-1)' }: Props = $props();
</script>

<div class="card tile">
  <div class="label">
    <span class="swatch" style:background={color}></span>{label}
  </div>
  <div class="value">{format(value)}</div>
  {#if sub}<div class="sub">{sub}</div>{/if}
</div>

<style>
  .tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px 18px 14px;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
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
    font-size: 13px;
    color: var(--ink-3);
  }
</style>
