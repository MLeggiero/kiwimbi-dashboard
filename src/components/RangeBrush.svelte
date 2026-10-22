<script lang="ts">
  import { buildBrush, DAY_MS, MARK_STRIP, type BrushMark } from '../charts/brush';
  import type { ECharts } from '../lib/echarts';
  import { app } from '../lib/state.svelte';
  import { readChartTheme, themeState } from '../lib/theme.svelte';
  import EChart from './EChart.svelte';

  let { marks = [] }: { marks?: BrushMark[] } = $props();
  let chart: ECharts | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const option = $derived.by(() => {
    void themeState.version;
    const ds = app.data;
    if (!ds) return {};
    const [from, to] = app.range;
    return buildBrush(ds, from, to, readChartTheme(), marks);
  });

  function onZoom() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const zoom = (chart?.getOption() as { dataZoom?: { startValue?: number; endValue?: number }[] } | undefined)?.dataZoom?.[0];
      if (!zoom || zoom.startValue === undefined || zoom.endValue === undefined || !app.data) return;
      const from = Math.floor(zoom.startValue / DAY_MS);
      const to = Math.min(Math.floor(zoom.endValue / DAY_MS), app.data.today);
      if (from !== app.range[0] || to !== app.range[1]) app.setCustom(from, to);
    }, 200);
  }
</script>

<div class="brush">
  <EChart {option} height={marks.length ? 46 + MARK_STRIP : 46} label="Reporting activity over time. Drag the handles or the window to change the date range.{marks.length ? ' Marked underneath: the periods being compared.' : ''}" onready={(c) => (chart = c)} events={{ datazoom: onZoom }} />
</div>

<style>
  .brush {
    margin: 10px -8px 0;
  }
</style>
