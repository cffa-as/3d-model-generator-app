"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "./image-upload"
import { TaskService } from "@/lib/tasks"
import { Loader2, Sparkles, Images } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MultiImageGeneratorProps {
  onTaskCreated?: (taskId: string) => void
}

export function MultiImageGenerator({ onTaskCreated }: MultiImageGeneratorProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [enablePbr, setEnablePbr] = useState(true)
  const [shouldRemesh, setShouldRemesh] = useState(true)
  const [shouldTexture, setShouldTexture] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleImageUpload = (files: File[]) => {
    setUploadedFiles(files)
  }

  const handleImageRemove = () => {
    setUploadedFiles([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (uploadedFiles.length < 2) {
      toast({
        title: "错误",
        description: "请至少上传2张图片",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await TaskService.createTask({
        task_type: "multi_image",
        prompt: "从多张图片生成3D模型",
        images: uploadedFiles,
        art_style: enablePbr ? "pbr" : "basic",
        format: "glb",
      })

      toast({
        title: "任务创建成功",
        description: "正在从多张图片生成3D模型，请稍候...",
      })

      if (onTaskCreated) {
        onTaskCreated(result.task_id)
      }

      // 重置表单
      setUploadedFiles([])
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "创建任务时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          多图生成3D模型
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 图片上传 */}
          <div className="space-y-2">
            <Label>上传多张图片</Label>
            <ImageUpload
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              accept="image/jpeg,image/png"
              multiple={true}
              maxFiles={5}
            />
            <p className="text-xs text-muted-foreground">上传2-5张不同角度的图片，可以生成更精确的3D模型</p>
          </div>

          {/* 当前已上传图片数量 */}
          {uploadedFiles.length > 0 && (
            <div className="text-sm text-muted-foreground">已上传 {uploadedFiles.length} 张图片</div>
          )}

          {/* 生成选项 */}
          <div className="space-y-4">
            <h4 className="font-medium">生成选项</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-pbr-multi">启用PBR材质</Label>
                  <p className="text-xs text-muted-foreground">生成物理基础渲染材质，提供更真实的光照效果</p>
                </div>
                <Switch id="enable-pbr-multi" checked={enablePbr} onCheckedChange={setEnablePbr} disabled={isLoading} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="should-remesh-multi">重建网格</Label>
                  <p className="text-xs text-muted-foreground">优化模型网格结构，提高模型质量</p>
                </div>
                <Switch
                  id="should-remesh-multi"
                  checked={shouldRemesh}
                  onCheckedChange={setShouldRemesh}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="should-texture-multi">生成贴图</Label>
                  <p className="text-xs text-muted-foreground">为模型生成详细的纹理贴图</p>
                </div>
                <Switch
                  id="should-texture-multi"
                  checked={shouldTexture}
                  onCheckedChange={setShouldTexture}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <Button type="submit" className="w-full" disabled={isLoading || uploadedFiles.length < 2}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
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
  )
}
