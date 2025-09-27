"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TaskProgress } from "@/components/tasks/task-progress"
import { ModelViewer } from "@/components/tasks/model-viewer"
import { RefineModelDialog } from "@/components/tasks/refine-model-dialog"
import { ApiService } from "@/lib/api"
import { ArrowLeft, RefreshCw, Brush, Wand2, Download, Trash2, Info } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { TaskService } from "@/lib/tasks"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModelRating } from "@/components/tasks/model-rating"
import { Star } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

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
  const [activeTexture, setActiveTexture] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRefineDialog, setShowRefineDialog] = useState(false)
  const [rating, setRating] = useState<{ rating: number; comment: string } | null>(null)
  const [isLoadingRating, setIsLoadingRating] = useState(false)

  const loadTask = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError("")
        
        // 持续尝试获取任务状态，直到成功
        const taskData = await ApiService.getTaskStatus(taskId)
        console.log("任务数据:", taskData)
        setTask(taskData)
        
        // 如果成功获取到任务数据，清除错误状态
        setError("")
      } catch (err) {
        // 不设置错误状态，继续轮询
        console.log("获取任务状态失败，继续重试:", err)
        // 只有在初次加载时才显示错误
        if (showLoading && !task) {
          setError("正在等待任务准备就绪...")
        }
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [taskId], // 移除 task 依赖，避免循环依赖
  )

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

  const handleRefine = async (params: { enable_pbr: boolean; texture_prompt?: string }) => {
    try {
      setIsRefining(true)
      const result = await ApiService.createTask({
        task_type: "text",
        mode: "refine",
        prompt: "", // 精细化任务不需要主提示词
        preview_task_id: taskId,
        enable_pbr: params.enable_pbr,
        texture_prompt: params.texture_prompt,
      })
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

  const handleDelete = async () => {
    if (!task) return

    setIsDeleting(true)
    try {
      await ApiService.deleteTask(task.task_id)
      toast({
        title: "删除成功",
        description: "任务已成功删除",
      })
      router.push("/tasks")
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除任务时发生错误",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  const downloadModel = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    }, 3000) // 每3秒轮询一次

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [task?.status, loadTask]) // 只依赖任务状态

  // 如果没有任务数据，持续重试获取
  useEffect(() => {
    if (!task && user && taskId && !loading) {
      const retryInterval = setInterval(() => {
        console.log("任务数据为空，重试获取...")
        loadTask(false)
      }, 3000) // 每2秒重试一次

      return () => clearInterval(retryInterval)
    }
  }, [!task, user, taskId, loading, loadTask]) // 修改依赖项

  // 加载评分
  const loadRating = useCallback(async () => {
    try {
      setIsLoadingRating(true)
      const rating = await ApiService.getModelRating(taskId)
      setRating(rating)
    } catch (error) {
      console.error("加载评分失败:", error)
    } finally {
      setIsLoadingRating(false)
    }
  }, [taskId])

  useEffect(() => {
    if (task?.status === "completed") {
      loadRating()
    }
  }, [task?.status, loadRating])

  const handleRatingSubmitted = useCallback(async () => {
    // 短暂延迟以确保后端数据已更新
    await new Promise(resolve => setTimeout(resolve, 500))
    await loadRating()
  }, [loadRating])

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

  if (loading && !task) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {error || "加载任务详情中..."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 如果有任务数据，直接显示，即使还在加载中
  if (!task) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在等待任务准备就绪...</p>
          </div>
        </div>
      </div>
    )
  }

  const textureTypes = [
    { key: "base_color", label: "Base Color", color: "bg-blue-100 text-blue-800" },
    { key: "metallic", label: "Metallic", color: "bg-purple-100 text-purple-800" },
    { key: "normal", label: "Normal", color: "bg-green-100 text-green-800" },
    { key: "roughness", label: "Roughness", color: "bg-red-100 text-red-800" },
  ]

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

            {task.status === "pending" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  任务正在生成中，您可以离开此页面。系统会在后台继续处理，完成后可在任务列表中查看结果。
                </AlertDescription>
              </Alert>
            )}

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

            {/* 下载选项 */}
            {task.status === "completed" && task.model_urls && Object.keys(task.model_urls).length > 0 && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>下载模型</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(task.model_urls).map(
                      ([format, url]) =>
                        url && (
                          <Button
                            key={format}
                            variant="outline"
                            size="sm"
                            onClick={() => downloadModel(url, `model.${format}`)}
                            className="text-xs hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {format.toUpperCase()}
                          </Button>
                        ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 贴图文件 */}
            {task.status === "completed" && task.texture_urls && task.texture_urls.length > 0 && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>贴图文件</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {textureTypes.map(({ key, label, color }) => {
                      const url = task.texture_urls?.[0]?.[key as keyof (typeof task.texture_urls)[0]]
                      if (!url) return null

                      return (
                        <HoverCard key={key} openDelay={200}>
                          <HoverCardTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadModel(url, `texture_${key}.jpg`)}
                              className="text-xs hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              {label}
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 p-0">
                            <div className="relative">
                              <img
                                src={url}
                                alt={`${label} 贴图`}
                                className="w-full rounded-md"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-xs text-white font-medium">{label} 贴图预览</p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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

              {task.status === "completed" && task.task_type === "text" && !task.preview_task_id && (
                <Button 
                  variant="default" 
                  onClick={() => setShowRefineDialog(true)} 
                  disabled={isRefining} 
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isRefining ? "精细化生成中..." : "精细化生成"}
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="w-full cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除任务
                  </>
                )}
              </Button>

              {/* 删除确认对话框 */}
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除任务？</AlertDialogTitle>
                    <AlertDialogDescription>
                      {task.preview_task_id
                        ? "此操作将删除此精细化任务。"
                        : task.task_type === "text"
                          ? "此操作将删除此预览任务及其相关的精细化任务（如果有）。"
                          : "此操作将永久删除此任务。"}
                      此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className={cn(
                        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                        isDeleting && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {isDeleting ? "删除中..." : "确认删除"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* 右侧：3D模型预览 */}
          <div className="space-y-4">
            <ModelViewer
              modelUrl={task.model_urls?.glb}
              model_urls={task.model_urls}
              textureUrls={task.texture_urls?.[0]}
              thumbnail={task.thumbnail_url}
            />
            {task.model_urls?.glb && (
              <Alert variant="default" className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm space-y-1">
                    <p>操作方式：左键旋转 · 右键平移 · 滚轮缩放</p>
                    <p>点击右上角按钮可切换全屏和背景颜色</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 评分区域 */}
            {task.status === "completed" && !rating?.rating && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>模型评分</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRating ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">加载评分中...</p>
                    </div>
                  ) : (
                    <ModelRating
                      taskId={task.task_id}
                      initialRating={rating?.rating}
                      initialComment={rating?.comment}
                      onRatingSubmitted={handleRatingSubmitted}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* 已评分显示 */}
            {task.status === "completed" && rating?.rating && (
              <Card className="glass">
                <CardHeader>
                  <CardTitle>您的评分</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1">
                    {[...Array(10)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-5 w-5",
                          i < rating.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {rating.rating} 分
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rating.comment}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 添加精细化生成对话框 */}
      <RefineModelDialog
        isOpen={showRefineDialog}
        onClose={() => setShowRefineDialog(false)}
        onConfirm={handleRefine}
        isLoading={isRefining}
      />
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
