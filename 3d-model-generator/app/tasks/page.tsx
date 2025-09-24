"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskService } from "@/lib/tasks"
import { Clock, CheckCircle, AlertCircle, Search, Filter, Type, Eye, ImageIcon, Images, Trash2, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ApiService } from "@/lib/api"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  prompt?: string // Added prompt to the interface
  task_type?: "text" | "image" | "multi_image" // Added task_type to the interface
  preview_task_id?: string // Added preview_task_id to the interface
}

function TasksPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskStatus[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<TaskStatus | null>(null)
  const [showDownloadDialog, setShowDownloadDialog] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchTerm, statusFilter])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const taskList = await TaskService.getTasks()
      console.log('加载到的任务列表:', taskList) // 添加调试日志
      setTasks(taskList)
    } catch (error) {
      console.error("加载任务失败:", error)
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "加载任务列表失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // 搜索筛选
    if (searchTerm) {
      filtered = filtered.filter((task) => 
        task.task_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.prompt?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTasks(filtered)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
      case "completed":
        return "bg-green-400/10 text-green-400 border-green-400/20"
      case "failed":
        return "bg-red-400/10 text-red-400 border-red-400/20"
      default:
        return "bg-muted text-muted-foreground"
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  const handleDelete = async () => {
    if (!taskToDelete) return
    
    setDeletingTaskId(taskToDelete.task_id)
    try {
      await ApiService.deleteTask(taskToDelete.task_id)
      toast({
        title: "删除成功",
        description: "任务已成功删除",
      })
      loadTasks()
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除任务时发生错误",
        variant: "destructive",
      })
    } finally {
      setDeletingTaskId(null)
      setShowDeleteDialog(false)
      setTaskToDelete(null)
    }
  }

  const confirmDelete = (task: TaskStatus) => {
    setTaskToDelete(task)
    setShowDeleteDialog(true)
  }

  const downloadModel = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 贴图类型定义
  const textureTypes = [
    { key: "base_color", label: "基础色", color: "bg-blue-400/10 text-blue-400" },
    { key: "metallic", label: "金属度", color: "bg-gray-400/10 text-gray-400" },
    { key: "normal", label: "法线", color: "bg-purple-400/10 text-purple-400" },
    { key: "roughness", label: "粗糙度", color: "bg-orange-400/10 text-orange-400" },
  ]

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
          <h1 className="text-3xl font-bold mb-2">任务历史</h1>
          <p className="text-muted-foreground">查看和管理您的3D模型生成任务</p>
        </div>

        {/* 筛选和搜索 */}
        <Card className="glass mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索任务ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-input/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-input/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">生成中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadTasks} disabled={loading}>
                  刷新
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 任务列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载任务中...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">暂无任务记录</h3>
              <p className="text-muted-foreground mb-6">
                {tasks.length === 0 ? "您还没有创建任何任务" : "没有找到匹配的任务"}
              </p>
              <Button asChild>
                <Link href="/dashboard">创建新任务</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="glass hover:glass-strong transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* 任务信息 */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">任务 #{task.task_id.slice(-8)}</h3>
                          <p className="text-sm text-muted-foreground">创建时间：{formatDate(task.created_at)}</p>
                        </div>
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{getStatusText(task.status)}</span>
                        </Badge>
                      </div>

                      {/* 任务类型和状态 */}
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {task.task_type === "text" && (
                            <>
                              <Type className="h-4 w-4" />
                              文本生成
                              {task.preview_task_id && task.texture_urls ? " (精细) (已贴图)" : 
                               task.preview_task_id ? " (精细)" : 
                               task.texture_urls ? " (已贴图)" : 
                               " (预览)"}
                            </>
                          )}
                          {task.task_type === "image" && (
                            <>
                              <ImageIcon className="h-4 w-4" />
                              单图生成
                            </>
                          )}
                          {task.task_type === "multi_image" && (
                            <>
                              <Images className="h-4 w-4" />
                              多图生成
                            </>
                          )}
                        </div>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              task.status === "completed" && "bg-green-400",
                              task.status === "failed" && "bg-red-400",
                              task.status === "pending" && "bg-yellow-400",
                            )}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tasks/${task.task_id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            查看详情
                          </Link>
                        </Button>
                        {task.status === "completed" && (task.model_urls || task.texture_urls) && (
                          <Dialog open={showDownloadDialog === task.task_id} onOpenChange={(open) => setShowDownloadDialog(open ? task.task_id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-blue-500 hover:text-blue-600">
                                <Download className="h-4 w-4 mr-1" />
                                下载文件
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>下载文件</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                {task.model_urls && Object.keys(task.model_urls).length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">模型文件</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(task.model_urls).map(([format, url]) => (
                                        url && (
                                          <Button
                                            key={format}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              downloadModel(url, `model.${format}`)
                                              setShowDownloadDialog(null)
                                            }}
                                            className="text-xs"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            {format.toUpperCase()}
                                          </Button>
                                        )
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {task.texture_urls && task.texture_urls.length > 0 && (
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm">贴图文件</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {textureTypes.map(({ key, label }) => {
                                        const url = task.texture_urls?.[0]?.[key as keyof typeof task.texture_urls[0]]
                                        if (!url) return null

                                        return (
                                          <Button
                                            key={key}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              downloadModel(url, `texture_${key}.jpg`)
                                              setShowDownloadDialog(null)
                                            }}
                                            className="text-xs"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            {label}
                                          </Button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDelete(task)}
                          disabled={deletingTaskId === task.task_id}
                          className={cn(
                            "text-red-500 hover:text-red-600 cursor-pointer",
                            deletingTaskId === task.task_id && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {deletingTaskId === task.task_id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-1" />
                              删除中...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              删除
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 预览图 */}
                    <div className="w-full md:w-48">
                      <div className="aspect-square bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg flex items-center justify-center">
                        {task.thumbnail_url ? (
                          <img
                            src={task.thumbnail_url || "/placeholder.svg"}
                            alt="任务预览"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <Type className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-muted-foreground">预览图</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务？</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete?.preview_task_id ? (
                "此操作将删除此精细化任务。"
              ) : taskToDelete?.task_type === "text" ? (
                "此操作将删除此预览任务及其相关的精细化任务（如果有）。"
              ) : (
                "此操作将永久删除此任务。"
              )}
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingTaskId}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingTaskId}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                deletingTaskId && "opacity-50 cursor-not-allowed"
              )}
            >
              {deletingTaskId ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <TasksPage />
    </AuthProvider>
  )
}
