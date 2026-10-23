<script lang="ts">
  // Small outline icon set (24px grid, stroke = currentColor). Paths joined with "|".
  let { name, size = 16 }: { name: string; size?: number } = $props();

  const C9 = 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0';
  const PATHS: Record<string, string> = {
    home: 'M3 11l9-8 9 8|M5 10v10h14V10|M10 20v-6h4v6',
    plate: `${C9}|M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0`,
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z|M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
    school: 'M22 9L12 4 2 9l10 5 10-5z|M6 11v5c3 3 9 3 12 0v-5',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z|M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
    grid: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',
    sun: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M4.9 19.1l1.4-1.4|M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    monitor: 'M3 5h18v12H3z|M8 21h8|M12 17v4',
    printer: 'M6 9V3h12v6|M6 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2|M6 14h12v7H6z',
    refresh: 'M20 11a8 8 0 1 0-2.3 5.7|M20 4v7h-7',
    table: 'M3 5h18v14H3z|M3 10h18|M9 5v14',
    chart: 'M4 20h16|M7 16v-5|M12 16V7|M17 16v-8',
    download: 'M12 4v11|M7 10l5 5 5-5|M5 20h14',
    image: 'M3 5h18v14H3z|M3 16l5-5 4 4 3-3 6 6|M15 9h.01',
    info: `${C9}|M12 11v5|M12 8h.01`,
    'arrow-up': 'M12 19V5|M6 11l6-6 6 6',
    'arrow-down': 'M12 5v14|M6 13l6 6 6-6',
    minus: 'M5 12h14',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z|M12 9v4|M12 17h.01',
    check: 'M5 12l5 5L20 7',
    clock: `${C9}|M12 7v5l3 2`,
    external: 'M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    user: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0|M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
    lock: 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 8 0v4',
    x: 'M6 6l12 12|M18 6L6 18',
    calendar: 'M3 5h18v16H3z|M16 3v4|M8 3v4|M3 11h18',
    'chevron-left': 'M15 6l-6 6 6 6',
    'chevron-right': 'M9 6l6 6-6 6',
    'chevron-down': 'M6 9l6 6 6-6',
    swap: 'M4 8h15|M15 4l4 4-4 4|M20 16H5|M9 12l-4 4 4 4',
  };
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#each (PATHS[name] ?? '').split('|') as d, i (i)}
    <path {d} />
  {/each}
</svg>
