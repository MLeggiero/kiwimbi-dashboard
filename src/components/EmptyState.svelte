<script lang="ts">
  import Icon from './Icon.svelte';
  let { text = 'No reports in this date range yet.', icon = 'calendar' }: { text?: string; icon?: string } = $props();
</script>

<div class="empty">
  <span class="ring"><Icon name={icon} size={18} /></span>
  <p>{text}</p>
</div>

<style>
  .empty {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 28px 8px;
    color: var(--ink-3);
    font-size: 14px;
  }
  .ring {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--card-2);
    border: 1px solid var(--rule);
    flex: none;
  }
  p {
    margin: 0;
  }
</style>
