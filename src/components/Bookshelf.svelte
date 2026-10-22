<script lang="ts">
  // Books borrowed as a bookshelf: each spine stands for a round number of books.
  // Spine sizes and colors vary in a fixed pattern (no randomness), so the shelf looks
  // the same on every visit and in print.
  import { fmtInt } from '../lib/format';

  let { books, label }: { books: number; label: string } = $props();

  const COLORS = ['var(--water)', 'var(--leaf)', 'var(--sun)', 'var(--coral)', 'var(--teal)', 'var(--earth)', 'var(--water-deep)', 'var(--leaf-deep)'];
  const unit = $derived([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000].find((u) => books / u <= 120) ?? 10000);
  const count = $derived(Math.floor(books / unit));
  const spines = $derived(
    Array.from({ length: count }, (_, i) => {
      const h = (i * 7919) % 97;
      return {
        height: 36 + (h % 19),
        width: 9 + ((i * 31) % 6),
        color: COLORS[(i * 5 + (i >> 3)) % COLORS.length],
        band: h % 3 === 0,
        lean: i % 17 === 11,
      };
    }),
  );
</script>

<figure class="shelf-wrap">
  <div class="shelf" role="img" aria-label="{label}: {fmtInt(books)} books, shown as {count} spines of {fmtInt(unit)} books each">
    {#each spines as s, i (i)}
      <span class="slot" class:lean={s.lean}>
        <span class="spine" class:band={s.band} style:height="{s.height}px" style:width="{s.width}px" style:background={s.color}></span>
      </span>
    {/each}
  </div>
  <figcaption>Each spine is {fmtInt(unit)} books borrowed.</figcaption>
</figure>

<style>
  .shelf-wrap {
    margin: 0;
  }
  .shelf {
    --row: 64px;
    --board: 7px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0 2px;
    min-height: var(--row);
    padding: 0 6px;
    background: linear-gradient(to top, #8a5a3b 0 var(--board), transparent var(--board)) 0 0 / 100% var(--row);
  }
  .slot {
    display: flex;
    align-items: flex-end;
    height: var(--row);
    padding-bottom: var(--board);
  }
  .slot.lean {
    padding-left: 5px;
  }
  .slot.lean .spine {
    transform: rotate(-9deg);
    transform-origin: bottom left;
  }
  .spine {
    display: block;
    border-radius: 2px 2px 0 0;
    box-shadow: inset -2px 0 0 rgba(0, 0, 0, 0.12);
  }
  .spine.band {
    background-image: linear-gradient(to bottom, transparent 22%, rgba(255, 255, 255, 0.55) 22% 30%, transparent 30%) !important;
  }
  figcaption {
    margin-top: 10px;
    font-size: 13px;
    color: var(--ink-3);
  }
</style>
