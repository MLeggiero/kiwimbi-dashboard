<script lang="ts">
  import { onMount } from 'svelte';
  import { echarts, type ECharts, type EChartsCoreOption } from '../lib/echarts';

  interface Props {
    option: EChartsCoreOption;
    height?: number;
    /** Screen-reader summary of what the chart shows. */
    label: string;
    onready?: (chart: ECharts) => void;
    events?: Record<string, (e: unknown) => void>;
  }
  let { option, height = 260, label, onready, events }: Props = $props();

  let el: HTMLDivElement;
  let chart = $state.raw<ECharts | null>(null);

  onMount(() => {
    const c = echarts.init(el, undefined, { renderer: 'canvas' });
    for (const [name, fn] of Object.entries(events ?? {})) c.on(name, fn);
    chart = c;
    onready?.(c);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      c.dispose();
    };
  });

  $effect(() => {
    chart?.setOption(option, { notMerge: true });
  });
</script>

<div class="echart" bind:this={el} style:height="{height}px" role="img" aria-label={label}></div>

<style>
  .echart {
    width: 100%;
    min-width: 0;
  }
</style>
