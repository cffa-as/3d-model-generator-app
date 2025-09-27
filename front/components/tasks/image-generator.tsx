"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "./image-upload"
import { TaskService } from "@/lib/tasks"
import { Loader2, Sparkles, ImageIcon, Settings2, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
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
import { ApiService } from "@/lib/api"

interface ImageGeneratorProps {
  onTaskCreated?: (taskId: string) => void
}

interface SimilarModelResult {
  task_id: string;
  prompt: string;
  created_at: string;
  model_urls?: {
    glb?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
}

export function ImageGenerator({ onTaskCreated }: ImageGeneratorProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [similarModels, setSimilarModels] = useState<SimilarModelResult[]>([])
  const [showSimilarDialog, setShowSimilarDialog] = useState(false)
  const [currentModelIndex, setCurrentModelIndex] = useState(0)
  
  // 基础参数
  const [shouldTexture, setShouldTexture] = useState(true)
  const [enablePbr, setEnablePbr] = useState(true)
  const [texturePrompt, setTexturePrompt] = useState("")
  
  // 高级参数
  const [topology, setTopology] = useState<"quad" | "triangle">("triangle")
  const [targetPolycount, setTargetPolycount] = useState<number>(30000)
  const [symmetryMode, setSymmetryMode] = useState<"off" | "auto" | "on">("auto")
  const [shouldRemesh, setShouldRemesh] = useState(true)
  const [isAtPose, setIsAtPose] = useState(false)
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingState, setLoadingState] = useState<'idle' | 'uploading' | 'checking-similarity' | 'generating'>('idle')
  const router = useRouter()
  const { toast } = useToast()
  const [imageBase64Urls, setImageBase64Urls] = useState<string[]>([])

  // 添加切换模型的函数
  const handleNextModel = () => {
    setCurrentModelIndex((prev) => 
      prev < similarModels.length - 1 ? prev + 1 : 0
    )
  }

  // 获取当前显示的模型
  const currentModel = similarModels[currentModelIndex]

  // 检查相似模型
  const checkSimilarModels = useCallback(async (imageFiles: File[]) => {
    try {
      setLoadingState('uploading')
      // 先上传图片
      const formData = new FormData()
      imageFiles.forEach(file => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch(`${ApiService.getApiBaseUrl()}/tasks/upload`, {
        method: 'POST',
        headers: {
          ...ApiService.getAuthHeaders(),
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('上传图片失败')
      }

      const uploadResult = await uploadResponse.json()
      const imagePaths = uploadResult.results.map((r: any) => r.file_path)
      const imageUrls = uploadResult.results.map((r: any) => r.base64_image)

      // 保存base64编码，后面创建任务时使用
      setImageBase64Urls(imageUrls)

      setLoadingState('checking-similarity')
      // 检查相似模型
      const result = await TaskService.checkSimilarModels({
        task_type: "image",
        image_paths: imagePaths
      })

      if (result.found && result.models.length > 0) {
        setSimilarModels(result.models)
        setCurrentModelIndex(0)
        setShowSimilarDialog(true)
        setLoadingState('idle')
        return true
      }
      setLoadingState('idle')
      return false
    } catch (error) {
      console.error("检查相似模型失败:", error)
      setLoadingState('idle')
      toast({
        title: "错误",
        description: "检查相似模型失败",
        variant: "destructive",
      })
      return false
    }
  }, [])

  const handleImageUpload = async (files: File[]) => {
    setUploadedFiles(files)
    // 移除自动相似度检查，改为在点击生成时检查
    // await checkSimilarModels(files)
  }

  const handleImageRemove = () => {
    setUploadedFiles([])
  }

  // 查看相似模型
  const handleViewSimilar = () => {
    if (currentModel?.task_id) {
      router.push(`/tasks/${currentModel.task_id}`)
    }
    setShowSimilarDialog(false)
  }

  // 继续生成新模型
  const handleGenerateAnyway = async () => {
    setShowSimilarDialog(false)
    await handleSubmit(new Event("submit") as any, false)
  }

  const handleSubmit = async (e: React.FormEvent, useCachedModel: boolean = true) => {
    e.preventDefault()

    if (uploadedFiles.length === 0) {
      toast({
        title: "错误",
        description: "请上传图片",
        variant: "destructive",
      })
      return
    }

    // 如果没有图片数据，先处理图片上传
    if (!imageBase64Urls || imageBase64Urls.length === 0) {
      try {
        setLoadingState('uploading')
        // 先上传图片获取base64数据
        const formData = new FormData()
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })

        const uploadResponse = await fetch(`${ApiService.getApiBaseUrl()}/tasks/upload`, {
          method: 'POST',
          headers: {
            ...ApiService.getAuthHeaders(),
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          throw new Error('上传图片失败')
        }

        const uploadResult = await uploadResponse.json()
        const imageUrls = uploadResult.results.map((r: any) => r.base64_image)
        setImageBase64Urls(imageUrls)

        // 如果启用缓存检查，现在检查相似度
        if (useCachedModel && !showSimilarDialog) {
          setLoadingState('checking-similarity')
          const imagePaths = uploadResult.results.map((r: any) => r.file_path)
          const result = await TaskService.checkSimilarModels({
            task_type: "image",
            image_paths: imagePaths
          })

          if (result.found && result.models.length > 0) {
            setSimilarModels(result.models)
            setCurrentModelIndex(0)
            setShowSimilarDialog(true)
            setLoadingState('idle')
            return  // 显示相似模型对话框，等待用户选择
          }
        }
        
        // 如果没有检查相似度或没有找到相似模型，直接继续执行生成任务
        // 使用局部变量 imageUrls 而不是依赖状态
        setLoadingState('generating')
        
        const taskData = {
          task_type: "image",
          image_urls: imageUrls,  // 使用局部变量而不是状态
          // 基础参数
          should_texture: shouldTexture,
          enable_pbr: shouldTexture && enablePbr,
          texture_prompt: shouldTexture ? texturePrompt : undefined,
          // 高级参数
          ...(isAdvancedMode && {
            topology,
            target_polycount: targetPolycount,
            symmetry_mode: symmetryMode,
            should_remesh: shouldRemesh,
            is_a_t_pose: isAtPose,
          }),
        }

        try {
          const result = await TaskService.createTask(taskData, useCachedModel)
          
          toast({
            title: "任务创建成功",
            description: "您的模型正在生成中，请稍候...",
          })

          if (onTaskCreated) {
            onTaskCreated(result.task_id)
          }

          // 重置表单
          setUploadedFiles([])
          setImageBase64Urls([])
        } catch (taskError) {
          console.error("Task creation error:", taskError)
          toast({
            title: "创建失败",
            description: taskError instanceof Error ? taskError.message : "创建任务时发生错误",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
          setLoadingState('idle')
          setShowSimilarDialog(false)
        }
        
        return  // 重要：这里要return，避免执行后面的代码
              } catch (error) {
        console.error("处理图片失败:", error)
        setIsLoading(false)
        setLoadingState('idle')
        toast({
          title: "错误",
          description: "图片处理失败，请重新上传",
          variant: "destructive",
        })
        return
      }
    } else if (useCachedModel && !showSimilarDialog) {
      // 如果已有图片数据但还没检查相似度
      const hasSimilar = await checkSimilarModels(uploadedFiles)
      if (hasSimilar) {
        return  // 显示相似模型对话框，等待用户选择
      }
    }

    // 如果执行到这里，说明已经有图片数据，可以直接生成任务
    setIsLoading(true)
    setLoadingState('generating')
    try {
      const taskData = {
        task_type: "image",
        image_urls: imageBase64Urls,  // 使用状态中的base64编码
        // 基础参数
        should_texture: shouldTexture,
        enable_pbr: shouldTexture && enablePbr,
        texture_prompt: shouldTexture ? texturePrompt : undefined,
        // 高级参数
        ...(isAdvancedMode && {
          topology,
          target_polycount: targetPolycount,
          symmetry_mode: symmetryMode,
          should_remesh: shouldRemesh,
          is_a_t_pose: isAtPose,
        }),
      }

      const result = await TaskService.createTask(taskData, useCachedModel)

      toast({
        title: "任务创建成功",
        description: "正在从图片生成3D模型，请稍候...",
      })

      if (onTaskCreated) {
        onTaskCreated(result.task_id)
      }

      // 重置表单
      setUploadedFiles([])
      setImageBase64Urls([])
    } catch (error) {
      console.error("Task creation error:", error)
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "创建任务时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setLoadingState('idle')
      setShowSimilarDialog(false)
    }
  }

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              图片生成3D模型
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-4 gap-2 font-medium transition-all duration-200",
                "hover:border-primary hover:text-primary",
                isAdvancedMode && "border-primary text-primary"
              )}
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            >
              <Settings2 className={cn(
                "h-4 w-4 transition-transform duration-200",
                isAdvancedMode && "rotate-180"
              )} />
              {isAdvancedMode ? "返回基础模式" : "切换高级模式"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 图片上传 */}
            <div className="space-y-2">
              <Label>上传图片</Label>
              <ImageUpload onUpload={handleImageUpload} onRemove={handleImageRemove} accept="image/jpeg,image/png" />
            </div>

            {/* 基础选项 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="should-texture">生成贴图</Label>
                    <p className="text-xs text-muted-foreground">
                      为模型生成详细的纹理贴图（额外消耗10积分）
                    </p>
                  </div>
                  <Switch
                    id="should-texture"
                    checked={shouldTexture}
                    onCheckedChange={setShouldTexture}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="enable-pbr">启用PBR材质</Label>
                    <p className="text-xs text-muted-foreground">
                      生成物理基础渲染材质，提供更真实的光照效果
                    </p>
                  </div>
                  <Switch
                    id="enable-pbr"
                    checked={enablePbr}
                    onCheckedChange={setEnablePbr}
                    disabled={isLoading || !shouldTexture}
                  />
                </div>
              </div>

              {shouldTexture && (
                <div className="space-y-2">
                  <Label htmlFor="texture-prompt">贴图提示文本</Label>
                  <Textarea
                    id="texture-prompt"
                    value={texturePrompt}
                    onChange={(e) => setTexturePrompt(e.target.value)}
                    placeholder="可选：为模型提供额外的贴图生成提示，例如：金属质感的表面，带有磨损的痕迹..."
                    className="resize-none"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    提供额外的文本提示以引导贴图生成过程（可选，最大600字符）
                  </p>
                </div>
              )}
            </div>

            {/* 高级选项 */}
            {isAdvancedMode && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="topology">拓扑结构</Label>
                    <Select
                      value={topology}
                      onValueChange={(value: "quad" | "triangle") => setTopology(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="topology">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quad">四边形网格</SelectItem>
                        <SelectItem value="triangle">三角形网格</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      选择生成模型的网格结构类型
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symmetry-mode">对称模式</Label>
                    <Select
                      value={symmetryMode}
                      onValueChange={(value: "off" | "auto" | "on") => setSymmetryMode(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="symmetry-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">关闭对称</SelectItem>
                        <SelectItem value="auto">自动判断</SelectItem>
                        <SelectItem value="on">强制对称</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      控制模型生成过程中的对称性行为
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="target-polycount">目标面数</Label>
                      <span className="text-sm text-muted-foreground">
                        {targetPolycount.toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      id="target-polycount"
                      min={100}
                      max={300000}
                      step={100}
                      value={[targetPolycount]}
                      onValueChange={([value]) => setTargetPolycount(value)}
                      disabled={isLoading}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      设置生成模型的目标面数（100-300,000）
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="should-remesh">重建网格</Label>
                      <p className="text-xs text-muted-foreground">
                        优化模型网格结构，提高模型质量
                      </p>
                    </div>
                    <Switch
                      id="should-remesh"
                      checked={shouldRemesh}
                      onCheckedChange={setShouldRemesh}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="is-a-t-pose">A/T Pose</Label>
                        <p className="text-xs text-muted-foreground">
                          生成标准的A/T Pose姿态的模型
                        </p>
                    </div>
                    <Switch
                        id="is-a-t-pose"
                        checked={isAtPose}
                        onCheckedChange={setIsAtPose}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <Button type="submit" className="w-full" disabled={isLoading || uploadedFiles.length === 0 || loadingState !== 'idle'}>
              {loadingState === 'uploading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上传图片中...
                </>
              ) : loadingState === 'checking-similarity' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  检查相似度中...
                </>
              ) : loadingState === 'generating' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成模型中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始生成
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showSimilarDialog} onOpenChange={setShowSimilarDialog}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                发现相似模型
              </div>
              {similarModels.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextModel}
                  className="gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  换一个
                </Button>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                我们发现一个与您的图片相似的模型：
                {similarModels.length > 1 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({currentModelIndex + 1}/{similarModels.length})
                  </span>
                )}
              </p>
              <div className="rounded-lg border p-4 space-y-4">
                <p className="font-medium">{currentModel?.prompt}</p>
                <p className="text-sm text-muted-foreground">
                  创建时间：{new Date(currentModel?.created_at || "").toLocaleDateString()}
                </p>
                {currentModel?.thumbnail_url && (
                  <div className="relative w-full h-64 flex items-center justify-center bg-muted/50 rounded-md overflow-hidden">
                    <img 
                      src={currentModel.thumbnail_url} 
                      alt="模型预览" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
              <p>您是否要使用这个现有的模型？这将节省生成时间。</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowSimilarDialog(false)}
              disabled={loadingState !== 'idle'}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={() => handleGenerateAnyway()}
              disabled={loadingState !== 'idle'}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              {loadingState === 'generating' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "继续生成新模型"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleViewSimilar()}
              disabled={loadingState !== 'idle'}
            >
              查看相似模型
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
