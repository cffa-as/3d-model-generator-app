"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ApiService } from "@/lib/api"
import { Loader2, Sparkles, Type } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TextGeneratorProps {
  onTaskCreated?: (taskId: string) => void
}

export function TextGenerator({ onTaskCreated }: TextGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [enablePbr, setEnablePbr] = useState(true)
  const [shouldRemesh, setShouldRemesh] = useState(true)
  const [shouldTexture, setShouldTexture] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) {
      toast({
        title: "错误",
        description: "请输入文本描述",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await ApiService.createTask({
        task_type: "text",
        prompt: prompt.trim(),
        enable_pbr: enablePbr,
        should_remesh: shouldRemesh,
        should_texture: shouldTexture,
      })

      toast({
        title: "任务创建成功",
        description: "正在生成3D模型，请稍候...",
      })

      if (onTaskCreated) {
        onTaskCreated(result.task_id)
      }

      // 重置表单
      setPrompt("")
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
          <Type className="h-5 w-5 text-primary" />
          文本生成3D模型
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 文本输入 */}
          <div className="space-y-2">
            <Label htmlFor="prompt">描述文本</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="请详细描述您想要生成的3D模型，例如：一只可爱的卡通猫咪，坐着的姿势，橙色毛发，大眼睛..."
              className="min-h-[120px] bg-input/50"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">提示：描述越详细，生成的模型越准确</p>
          </div>

          {/* 生成选项 */}
          <div className="space-y-4">
            <h4 className="font-medium">生成选项</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enable-pbr">启用PBR材质</Label>
                  <p className="text-xs text-muted-foreground">生成物理基础渲染材质，提供更真实的光照效果</p>
                </div>
                <Switch id="enable-pbr" checked={enablePbr} onCheckedChange={setEnablePbr} disabled={isLoading} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="should-remesh">重建网格</Label>
                  <p className="text-xs text-muted-foreground">优化模型网格结构，提高模型质量</p>
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
                  <Label htmlFor="should-texture">生成贴图</Label>
                  <p className="text-xs text-muted-foreground">为模型生成详细的纹理贴图</p>
                </div>
                <Switch
                  id="should-texture"
                  checked={shouldTexture}
                  onCheckedChange={setShouldTexture}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <Button type="submit" className="w-full" disabled={isLoading || !prompt.trim()}>
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
