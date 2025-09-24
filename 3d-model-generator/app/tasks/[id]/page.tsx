"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TaskProgress } from "@/components/tasks/task-progress"
import { ModelViewer } from "@/components/tasks/model-viewer"
import { ApiService } from "@/lib/api"
import { ArrowLeft, RefreshCw, Brush, Wand2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { TaskService } from "@/lib/tasks"

interface TaskStatus {
  id: number
  task_id: string
  status: "pending" | "completed" | "failed"
  progress: number
  model_urls?: {
    glb?: string
    obj?: string
    fbx?: string
    usdz?: string
  }
  texture_urls?: Array<{
    base_color?: string
    metallic?: string
    normal?: string
    roughness?: string
  }>
  thumbnail_url?: string
  created_at: string
  started_at?: number
  finished_at?: number
  task_type?: "text" | "image"
  preview_task_id?: string
}

function TaskDetailPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [task, setTask] = useState<TaskStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isPolling, setIsPolling] = useState(false)
  const [isGeneratingTexture, setIsGeneratingTexture] = useState(false)
  const [isRefining, setIsRefining] = useState(false)

  const loadTask = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError("")
      const taskData = await ApiService.getTaskStatus(taskId)
      console.log('任务数据:', taskData) // 添加调试日志
      setTask(taskData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载任务失败")
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [taskId])

  const handleGenerateTexture = async () => {
    try {
      setIsGeneratingTexture(true)
      await TaskService.generateTexture({
        task_id: taskId,
        style: "realistic",
      })
      toast({
        title: "贴图生成已开始",
        description: "正在为模型生成贴图，请稍候...",
      })
      loadTask(true)
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成贴图时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingTexture(false)
    }
  }

  const handleRefine = async () => {
    try {
      setIsRefining(true)
      const result = await TaskService.refineTask(taskId)
      toast({
        title: "精细化生成已开始",
        description: "正在生成高质量模型，请稍候...",
      })
      router.push(`/tasks/${result.task_id}`)
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "精细化生成时发生错误",
        variant: "destructive",
      })
      setIsRefining(false)
    }
  }

  // 初始加载
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && taskId) {
          loadTask()
        }
  }, [user, taskId, loadTask])

  // 轮询进度
  useEffect(() => {
    if (!task || task.status !== "pending") {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    const interval = setInterval(() => {
      loadTask(false) // 不显示加载状态
    }, 3000) // 更频繁地更新

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [task, loadTask])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime || !endTime) return "未知"
    const duration = Math.round((endTime - startTime) / 1000)
    if (duration < 60) return `${duration}秒`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}分${seconds}秒`
  }

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

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2 text-red-400">加载失败</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/tasks">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    返回任务列表
                  </Link>
                </Button>
                <Button onClick={() => loadTask(true)}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading || !task) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载任务详情中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" asChild>
              <Link href="/tasks">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">任务详情 #{task.task_id.slice(-8)}</h1>
              <p className="text-muted-foreground">创建时间：{formatDate(task.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：任务信息和进度 */}
          <div className="space-y-6">
            {/* 任务进度 */}
            <TaskProgress
              status={task.status}
              progress={task.progress}
              error={task.status === "failed" ? "生成过程中遇到问题" : undefined}
            />

            {/* 任务详细信息 */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>任务信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">任务ID：</span>
                    <span className="font-mono">{task.task_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">状态：</span>
                    <span
                      className={
                        task.status === "completed"
                          ? "text-green-400"
                          : task.status === "failed"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }
                    >
                      {task.status === "pending" ? "生成中" : task.status === "completed" ? "已完成" : "失败"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">创建时间：</span>
                    <span>{formatDate(task.created_at)}</span>
                  </div>
                  {task.finished_at && (
                    <div>
                      <span className="text-muted-foreground">用时：</span>
                      <span>{formatDuration(task.started_at, task.finished_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => loadTask(true)}
                disabled={loading || isPolling}
                className="w-full bg-transparent"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isPolling && "animate-spin")} />
                {isPolling ? "自动更新中..." : "刷新状态"}
              </Button>

              {task.status === "completed" && !task.texture_urls && task.task_type === "text" && !task.preview_task_id && (
                <Button
                  variant="default"
                  onClick={handleGenerateTexture}
                  disabled={isGeneratingTexture}
                  className="w-full"
                >
                  <Brush className="h-4 w-4 mr-2" />
                  {isGeneratingTexture ? "生成贴图中..." : "生成贴图"}
                </Button>
              )}

              {task.status === "completed" && task.task_type === "text" && !task.preview_task_id && (
                <Button
                  variant="default"
                  onClick={handleRefine}
                  disabled={isRefining}
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isRefining ? "精细化生成中..." : "精细化生成"}
            </Button>
              )}
            </div>
          </div>

          {/* 右侧：3D模型预览 */}
          <div>
            <ModelViewer
              modelUrl={task.model_urls?.glb}
              model_urls={task.model_urls}
              textureUrls={task.texture_urls?.[0]}
              thumbnail={task.thumbnail_url}
              taskId={task.task_id}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <TaskDetailPage />
    </AuthProvider>
  )
}
