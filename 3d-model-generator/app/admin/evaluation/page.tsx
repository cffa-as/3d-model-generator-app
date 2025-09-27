"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { ModelEvaluation } from "@/components/admin/model-evaluation"
import { ApiService, API_BASE_URL } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: number
  task_id: string
  user_id: number
  username: string
  task_type: string
  status: string
  created_at: string
  model_urls: any
  texture_urls: any
  evaluation_status: string
  topology_score: number | null
  geometry_score: number | null
  rendering_score: number | null
  evaluation_history: any
  user_rating: number | null
  rating_comment: string | null
  rated_at: string | null
}

export default function EvaluationPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "admin") {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const data = await ApiService.getAdminTasks()
      console.log("加载的任务数据:", data)
      setTasks(data)
    } catch (error) {
      console.error("加载任务失败:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  // 计算平均用户评分
  const ratedTasks = tasks.filter(task => task.user_rating !== null)
  const averageUserRating = ratedTasks.length > 0
    ? ratedTasks.reduce((sum, task) => sum + Number(task.user_rating), 0) / ratedTasks.length
    : null

  // 计算评分率时只考虑已完成的任务
  const completedTasks = tasks
  const ratingPercentage = completedTasks.length > 0
    ? (ratedTasks.length / completedTasks.length) * 100
    : 0

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 用户评分概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                用户评分概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">平均评分</div>
                  <div className="text-2xl font-bold">
                    {averageUserRating !== null ? averageUserRating.toFixed(1) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">已评分任务</div>
                  <div className="text-2xl font-bold">{ratedTasks.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">评分率</div>
                  <div className="text-2xl font-bold">
                    {completedTasks.length > 0 ? `${ratingPercentage.toFixed(1)}%` : "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 系统评估组件 */}
          <ModelEvaluation />

          {/* 最近用户评分列表 */}
          <Card>
            <CardHeader>
              <CardTitle>最近用户评分</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <div className="font-medium">{task.username}</div>
                      <div className="text-sm text-muted-foreground">
                        评分时间：{new Date(task.rated_at!).toLocaleString("zh-CN")}
                      </div>
                      {task.rating_comment && (
                        <div className="mt-1 text-sm">{task.rating_comment}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(10)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < (task.user_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                      <span className="ml-2 font-medium">
                        {task.user_rating?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
                {ratedTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无用户评分
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 