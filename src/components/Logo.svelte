<script lang="ts">
  // The Kiwimbi logo, loaded from kiwimbi.org. If it can't load, the name is set in type instead.
  import { LOGO } from '../content';

  let { height = 52 }: { height?: number } = $props();
  const width = $derived(Math.round((height * 258) / 156));
  let failed = $state(false);
</script>

<span class="logo" style:height="{height}px">
  {#if failed}
    <span class="word" style:font-size="{Math.round(height * 0.42)}px">kiwimbi</span>
  {:else}
    <img src={LOGO.src} srcset={LOGO.srcset} sizes="{width}px" alt={LOGO.alt} {width} {height} referrerpolicy="no-referrer" onerror={() => (failed = true)} />
  {/if}
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    border-radius: 3px;
  }
  img {
    display: block;
    height: 100%;
    width: auto;
  }
  .word {
    font-weight: 800;
    font-stretch: 75%;
    color: var(--earth);
    letter-spacing: -0.01em;
    padding: 0 4px;
  }
  /* The logo is drawn for light backgrounds: on dark pages it sits on a small paper plate. */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .logo {
      background: #fbf8f1;
      padding: 2px 6px;
    }
  }
  :global(:root[data-theme='dark']) .logo {
    background: #fbf8f1;
    padding: 2px 6px;
  }
</style>
