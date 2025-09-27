"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ApiService, API_BASE_URL } from "@/lib/api"
import { X, Plus, Upload, History } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { TaskService, Task as TaskType } from "@/lib/tasks"

interface Task extends TaskType {
  preview_images?: string[]
  prompt?: string
}

interface UploadModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UploadModelDialog({
  open,
  onOpenChange,
  onSuccess
}: UploadModelDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [uploadMethod, setUploadMethod] = useState<"task" | "url">("task")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: [] as string[],
    model_url: "",
    preview_url: ""
  })
  const [newTag, setNewTag] = useState("")

  // 加载已完成的任务
  useEffect(() => {
    if (open) {
      loadCompletedTasks()
    }
  }, [open])

  const loadCompletedTasks = async () => {
    try {
      const taskList = await TaskService.getTasks()
      // 只显示已完成的任务
      const completedTasks = taskList.filter(task => task.status === "completed")
      setTasks(completedTasks)
    } catch (error) {
      console.error("加载任务失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载任务列表",
        variant: "destructive",
      })
    }
  }

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
    const modelUrl = task.model_urls?.glb
    if (modelUrl) {
      setFormData(prev => ({
        ...prev,
        title: `任务 #${task.task_id.slice(-8)}`,
        description: task.prompt || prev.description,
        model_url: modelUrl,
        preview_url: task.thumbnail_url || prev.preview_url
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.model_url) {
      toast({
        title: "请完善信息",
        description: "标题、分类和模型URL为必填项",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/showcase/models`, {
        method: "POST",
        headers: {
          ...ApiService.getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "上传成功",
          description: "您的模型已成功分享到模型广场",
        })
        onSuccess()
        onOpenChange(false)
        // 重置表单
        setFormData({
          title: "",
          description: "",
          category: "",
          tags: [],
          model_url: "",
          preview_url: ""
        })
        setSelectedTask(null)
        setUploadMethod("url")
      } else {
        throw new Error("上传失败")
      }
    } catch (error) {
      console.error("上传模型失败:", error)
      toast({
        title: "上传失败",
        description: "分享模型失败，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }))
      setNewTag("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>分享模型</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "task" | "url")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="task">从任务历史选择</TabsTrigger>
              <TabsTrigger value="url">直接输入URL</TabsTrigger>
            </TabsList>
            <TabsContent value="task" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择已完成的任务</label>
                <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                  {tasks.map((task) => (
                    <Card
                      key={task.task_id}
                      className={`cursor-pointer transition-colors ${
                        selectedTask?.task_id === task.task_id ? "border-primary" : ""
                      }`}
                      onClick={() => handleTaskSelect(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">任务 #{task.task_id.slice(-8)}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {task.task_type === "text" ? (
                                  <>文本生成</>
                                ) : task.task_type === "image" ? (
                                  <>单图生成</>
                                ) : task.task_type === "multi_image" ? (
                                  <>多图生成</>
                                ) : (
                                  <>未知类型</>
                                )}
                                {task.preview_task_id && " (精细)"}
                                {task.texture_urls && " (已贴图)"}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(task.created_at)}
                              </p>
                            </div>
                          </div>
                          {task.thumbnail_url && (
                            <div className="w-16 h-16 rounded-md overflow-hidden bg-muted">
                              <img
                                src={task.thumbnail_url}
                                alt="预览图"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {selectedTask?.task_id === task.task_id && (
                            <Badge variant="secondary">已选择</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      暂无已完成的任务
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">模型URL</label>
                <Input
                  placeholder="输入模型文件URL（支持glb格式）"
                  value={formData.model_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">预览图URL（可选）</label>
                <Input
                  placeholder="输入预览图URL"
                  value={formData.preview_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, preview_url: e.target.value }))}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <Input
              placeholder="输入模型标题"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Textarea
              placeholder="描述一下你的模型..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">分类</label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">角色模型</SelectItem>
                <SelectItem value="scene">场景模型</SelectItem>
                <SelectItem value="prop">道具模型</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">标签</label>
            <div className="flex gap-2">
              <Input
                placeholder="添加标签"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button type="button" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                "上传中..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  分享模型
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 