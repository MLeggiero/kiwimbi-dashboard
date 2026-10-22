<script lang="ts">
  import type { TableData } from '../lib/download';
  let { table, caption = 'Table view' }: { table: TableData; caption?: string } = $props();
  const fmt = (v: string | number | null) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : (v ?? '–'));
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="wrap" tabindex="0" role="region" aria-label={caption}>
  <table>
    <thead>
      <tr>
        {#each table.columns as c, i (i)}<th scope="col">{c}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each table.rows as r, ri (ri)}
        <tr>
          {#each r as v, i (i)}
            {#if i === 0}<th scope="row">{v}</th>{:else}<td class="num">{fmt(v)}</td>{/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap {
    max-height: 380px;
    overflow: auto;
    border: 1px solid var(--hairline);
    border-radius: 10px;
    margin-top: 10px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 6px 10px;
    text-align: right;
    border-bottom: 1px solid var(--hairline);
    white-space: nowrap;
  }
  th[scope='row'],
  thead th:first-child {
    text-align: left;
    font-weight: 400;
    color: var(--ink-2);
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--card-2);
    font-weight: 700;
    color: var(--ink);
  }
</style>
