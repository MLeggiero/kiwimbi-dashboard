// Tree-shaken ECharts: only the chart types and components the dashboard uses.
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import { CalendarComponent, DataZoomComponent, GridComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, HeatmapChart, GridComponent, TooltipComponent, DataZoomComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, CalendarComponent, VisualMapComponent, CanvasRenderer]);

export { echarts };
export type { ECharts, EChartsCoreOption } from 'echarts/core';
