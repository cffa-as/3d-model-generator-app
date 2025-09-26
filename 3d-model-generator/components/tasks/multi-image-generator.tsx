"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "./image-upload"
import { TaskService } from "@/lib/tasks"
import { Loader2, Sparkles, Images, Settings2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MultiImageGeneratorProps {
  onTaskCreated?: (taskId: string) => void
}

export function MultiImageGenerator({ onTaskCreated }: MultiImageGeneratorProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" />
            多图生成3D模型
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
