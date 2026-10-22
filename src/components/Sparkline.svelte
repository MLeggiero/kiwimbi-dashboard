<script lang="ts">
  // Trend in the de-emphasis ink; the latest point in the accent color. Gaps = no reports.
  let { values, color = 'var(--series-1)', width = 96, height = 28 }: { values: (number | null)[]; color?: string; width?: number; height?: number } = $props();

  const geo = $derived.by(() => {
    const nums = values.filter((v): v is number => v !== null);
    if (!nums.length) return { d: '', last: null as [number, number] | null };
    const max = Math.max(...nums, 1);
    const x = (i: number) => (values.length === 1 ? width / 2 : 3 + (i / (values.length - 1)) * (width - 6));
    const y = (v: number) => height - 4 - (v / max) * (height - 8);
    let d = '';
    let pen = false;
    let last: [number, number] | null = null;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
      last = [x(i), y(v)];
    });
    return { d, last };
  });
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
  <path d={geo.d} fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.75" />
  {#if geo.last}
    <circle cx={geo.last[0]} cy={geo.last[1]} r="3.5" fill={color} stroke="var(--card)" stroke-width="1.5" />
  {/if}
</svg>
