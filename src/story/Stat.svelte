<script lang="ts">
  // A headline number with what it counts and one sentence of context.
  let { value, label, text = '', color = 'var(--deep, var(--ink))', rule = 'var(--bright, var(--rule-strong))' }: { value: string; label: string; text?: string; color?: string; rule?: string } = $props();
</script>

<div class="stat" style:--rule={rule}>
  <div class="n display num" style:color={color}>{value}</div>
  <div class="label">{label}</div>
  {#if text}<p>{text}</p>{/if}
</div>

<style>
  .stat {
    border-top: 4px solid var(--rule);
    padding-top: 14px;
    min-width: 0;
  }
  .n {
    font-size: clamp(44px, 5.4vw, 68px);
  }
  .label {
    margin-top: 4px;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
  }
  p {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--ink-2);
    max-width: 30em;
  }
</style>
