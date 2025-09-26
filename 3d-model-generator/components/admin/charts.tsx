import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import type { PieLabelRenderProps } from "recharts"

interface ChartSectionProps {
  stats: {
    task_type_counts: {
      text: number
      image: number
      multi_image: number
    }
  }
}

export default function ChartSection({ stats }: ChartSectionProps) {
  // 准备图表数据
  const pieChartData = [
    { name: "文本生成", value: stats.task_type_counts.text, color: "#8B5CF6" },
    { name: "图片生成", value: stats.task_type_counts.image, color: "#10B981" },
    { name: "多图生成", value: stats.task_type_counts.multi_image, color: "#F59E0B" },
  ]

  const barChartData = [
    { name: "文本生成", count: stats.task_type_counts.text, fill: "#8B5CF6" },
    { name: "图片生成", count: stats.task_type_counts.image, fill: "#10B981" },
    { name: "多图生成", count: stats.task_type_counts.multi_image, fill: "#F59E0B" },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 饼图 - 任务类型分布 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            任务类型分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const percent = typeof props.percent === 'number' ? (props.percent * 100).toFixed(0) : "0"
                    return `${props.name} ${percent}%`
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 柱状图 - 任务数量对比 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            任务数量对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#374151", opacity: 0.5 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#374151", opacity: 0.5 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(55, 65, 81, 0.1)" }}
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.95)",
                    border: "1px solid rgba(55, 65, 81, 0.5)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    fontSize: "14px",
                    color: "#E5E7EB",
                  }}
                  itemStyle={{
                    color: "#E5E7EB",
                  }}
                  labelStyle={{
                    color: "#9CA3AF",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 