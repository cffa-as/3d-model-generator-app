"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ApiService } from "@/lib/api"
import { Users, FileText, BarChart3, TrendingUp, Type, ImageIcon, Images, RefreshCw, Activity } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import type { PieLabelRenderProps } from "recharts"

interface AdminStats {
  total_users: number
  total_tasks: number
  task_type_counts: {
    text: number
    image: number
    multi_image: number
  }
}

function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError("")
      const adminStats = await ApiService.getAdminStats()
      setStats(adminStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载统计数据失败")
    } finally {
      setLoading(false)
    }
  }

  // 准备图表数据
  const pieChartData = stats
    ? [
        { name: "文本生成", value: stats.task_type_counts.text, color: "#8B5CF6" },
        { name: "图片生成", value: stats.task_type_counts.image, color: "#10B981" },
        { name: "多图生成", value: stats.task_type_counts.multi_image, color: "#F59E0B" },
      ]
    : []

  const barChartData = stats
    ? [
        { name: "文本生成", count: stats.task_type_counts.text, fill: "#8B5CF6" },
        { name: "图片生成", count: stats.task_type_counts.image, fill: "#10B981" },
        { name: "多图生成", count: stats.task_type_counts.multi_image, fill: "#F59E0B" },
      ]
    : []

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">管理员面板</h1>
              <p className="text-muted-foreground">系统统计数据和用户活动概览</p>
            </div>
            <Button variant="outline" onClick={loadStats} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新数据
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2 text-red-400">加载失败</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={loadStats}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重试
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载统计数据中...</p>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.total_users}</div>
                  <p className="text-xs text-muted-foreground">注册用户总数</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.total_tasks}</div>
                  <p className="text-xs text-muted-foreground">已创建任务总数</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">文本生成</CardTitle>
                  <Type className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{stats.task_type_counts.text}</div>
                  <p className="text-xs text-muted-foreground">文本生成任务数</p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">图片生成</CardTitle>
                  <ImageIcon className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{stats.task_type_counts.image}</div>
                  <p className="text-xs text-muted-foreground">图片生成任务数</p>
                </CardContent>
              </Card>
            </div>

            {/* 图表区域 */}
            <div className="grid lg:grid-cols-2 gap-8">
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

            {/* 详细统计 */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* 任务类型详情 */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    任务类型详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-400/10 border border-purple-400/20">
                    <div className="flex items-center gap-3">
                      <Type className="h-5 w-5 text-purple-400" />
                      <div>
                        <p className="font-medium">文本生成3D</p>
                        <p className="text-sm text-muted-foreground">从文字描述生成模型</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-400">{stats.task_type_counts.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total_tasks > 0
                          ? Math.round((stats.task_type_counts.text / stats.total_tasks) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-400/10 border border-green-400/20">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="font-medium">图片生成3D</p>
                        <p className="text-sm text-muted-foreground">从单张图片生成模型</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">{stats.task_type_counts.image}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total_tasks > 0
                          ? Math.round((stats.task_type_counts.image / stats.total_tasks) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
                    <div className="flex items-center gap-3">
                      <Images className="h-5 w-5 text-orange-400" />
                      <div>
                        <p className="font-medium">多图生成3D</p>
                        <p className="text-sm text-muted-foreground">从多张图片生成模型</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-400">{stats.task_type_counts.multi_image}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.total_tasks > 0
                          ? Math.round((stats.task_type_counts.multi_image / stats.total_tasks) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 系统概览 */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>系统概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">平均每用户任务数</span>
                      <span className="font-semibold">
                        {stats.total_users > 0 ? (stats.total_tasks / stats.total_users).toFixed(1) : "0"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">最受欢迎的功能</span>
                      <span className="font-semibold">
                        {stats.task_type_counts.text >= stats.task_type_counts.image &&
                        stats.task_type_counts.text >= stats.task_type_counts.multi_image
                          ? "文本生成"
                          : stats.task_type_counts.image >= stats.task_type_counts.multi_image
                            ? "图片生成"
                            : "多图生成"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">系统状态</span>
                      <span className="font-semibold text-green-400">正常运行</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground text-center">
                      数据更新时间：{new Date().toLocaleString("zh-CN")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <AdminPage />
    </AuthProvider>
  )
}
