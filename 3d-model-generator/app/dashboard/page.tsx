"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextGenerator } from "@/components/tasks/text-generator"
import { ImageGenerator } from "@/components/tasks/image-generator"
import { MultiImageGenerator } from "@/components/tasks/multi-image-generator"
import { Type, ImageIcon, Images, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { TaskService } from "@/lib/tasks"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TaskStatus {
  id: number
  task_id: string
  status: "pending" | "completed" | "failed"
  progress: number
  created_at: string
  task_type?: string
}

function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskStatus[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadRecentTasks()
    }
  }, [user])

  const loadRecentTasks = async () => {
    try {
      setLoadingTasks(true)
      const tasks = await TaskService.getTasks(3, 0) // 只获取最近3个任务
      setRecentTasks(tasks)
    } catch (error) {
      console.error("加载任务失败:", error)
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "加载任务列表失败",
        variant: "destructive",
      })
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleTaskCreated = (taskId: string) => {
    setActiveTaskId(taskId)
    router.push(`/tasks/${taskId}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-400" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "生成中"
      case "completed":
        return "已完成"
      case "failed":
        return "失败"
      default:
        return "未知"
    }
  }

  const getTaskTypeIcon = (type?: string) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "multi_image":
        return <Images className="h-4 w-4" />
      default:
        return <Type className="h-4 w-4" />
    }
  }

  const getTaskTypeText = (type?: string) => {
    switch (type) {
      case "text":
        return "文本生成"
      case "image":
        return "图片生成"
      case "multi_image":
        return "多图生成"
      default:
        return "未知类型"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  // 统计数据
  const stats = {
    completed: recentTasks.filter(t => t.status === "completed").length,
    pending: recentTasks.filter(t => t.status === "pending").length,
    failed: recentTasks.filter(t => t.status === "failed").length,
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎区域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">欢迎回来，{user.username}！</h1>
          <p className="text-muted-foreground">选择一种方式开始创建您的3D模型</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 任务创建区域 */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  文本生成
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  图片生成
                </TabsTrigger>
                <TabsTrigger value="multi" className="flex items-center gap-2">
                  <Images className="h-4 w-4" />
                  多图生成
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <TextGenerator onTaskCreated={handleTaskCreated} />
              </TabsContent>

              <TabsContent value="image">
                <ImageGenerator onTaskCreated={handleTaskCreated} />
              </TabsContent>

              <TabsContent value="multi">
                <MultiImageGenerator onTaskCreated={handleTaskCreated} />
              </TabsContent>
            </Tabs>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 最近任务 */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  最近任务
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTasks ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-sm">加载任务中...</p>
                  </div>
                ) : recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.slice(0, 3).map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.task_id}`}
                        className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTaskTypeIcon(task.task_type)}
                            <span className="text-sm font-medium">{getTaskTypeText(task.task_type)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            {getStatusIcon(task.status)}
                            <span className="text-muted-foreground">{getStatusText(task.status)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(task.created_at)}</div>
                      </Link>
                    ))}
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href="/tasks">查看所有任务</Link>
                    </Button>
                  </div>
                ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">暂无任务记录</p>
                  <Button variant="outline" className="mt-4 bg-transparent" asChild>
                      <Link href="/tasks">查看所有任务</Link>
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>

            {/* 快速统计 */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>统计概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm">已完成</span>
                  </div>
                  <span className="font-semibold">{stats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">进行中</span>
                  </div>
                  <span className="font-semibold">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm">失败</span>
                  </div>
                  <span className="font-semibold">{stats.failed}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <DashboardPage />
    </AuthProvider>
  )
}
