<script lang="ts">
  // A captioned photo from kiwimbi.org. If the image can't load, the frame keeps its shape
  // (an empty tinted box), so the layout never collapses.
  import type { Photo } from '../content';

  interface Props {
    photo: Photo;
    /** CSS aspect ratio of the frame. */
    ratio?: string;
    eager?: boolean;
    sizes?: string;
    caption?: boolean;
  }
  let { photo, ratio = '3 / 2', eager = false, sizes = '(max-width: 800px) 100vw, 640px', caption = true }: Props = $props();
  let failed = $state(false);
</script>

<figure class="photo">
  <div class="frame" style:aspect-ratio={ratio}>
    {#if !failed}
      <img
        src={photo.src}
        srcset={photo.srcset}
        {sizes}
        alt={photo.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerpolicy="no-referrer"
        style:object-position={photo.focus ?? '50% 50%'}
        onerror={() => (failed = true)}
      />
    {/if}
  </div>
  {#if caption}
    <figcaption>{photo.caption} <span class="credit">Photo © Kiwimbi</span></figcaption>
  {/if}
</figure>

<style>
  .photo {
    margin: 0;
    min-width: 0;
  }
  .frame {
    position: relative;
    overflow: hidden;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  figcaption {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .credit {
    color: var(--ink-3);
    white-space: nowrap;
  }
</style>
