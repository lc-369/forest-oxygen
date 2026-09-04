// ===== ECharts 统一入口（模块化按需注册，减小打包体积）=====
// 其它组件只 `import echarts from '@/utils/echarts'`，无需重复 use()
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

export default echarts
