"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ApiService } from "@/lib/api"
import { Loader2, Sparkles, Type, Settings2, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface TextGeneratorProps {
  onTaskCreated?: (taskId: string) => void
  mode?: "preview" | "refine"
  previewTaskId?: string
}

export function TextGenerator({ onTaskCreated, mode = "preview", previewTaskId }: TextGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  
  // 预览模式参数
  const [artStyle, setArtStyle] = useState<"realistic" | "sculpture">("realistic")
  
  // 精细化模式参数
  const [enablePbr, setEnablePbr] = useState(false)
  const [texturePrompt, setTexturePrompt] = useState("")
  
  // 高级参数（仅预览模式）
  const [seed, setSeed] = useState<number | null>(null)
  const [topology, setTopology] = useState<"quad" | "triangle">("triangle")
  const [targetPolycount, setTargetPolycount] = useState<number>(30000)
  const [symmetryMode, setSymmetryMode] = useState<"off" | "auto" | "on">("auto")
  const [isAtPose, setIsAtPose] = useState(false)
  
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

    if (mode === "refine" && !previewTaskId) {
      toast({
        title: "错误",
        description: "精细化任务需要提供预览任务ID",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await ApiService.createTask({
        task_type: "text",
        prompt: prompt.trim(),
        mode,
        ...(mode === "preview" ? {
          // 预览模式参数
          art_style: artStyle,
          ...(isAdvancedMode && {
            // 高级参数
            seed,
            topology,
            target_polycount: targetPolycount,
            symmetry_mode: symmetryMode,
            is_a_t_pose: isAtPose,
          }),
        } : {
          // 精细化模式参数
          preview_task_id: previewTaskId,
          enable_pbr: enablePbr,
          texture_prompt: texturePrompt || undefined,
        }),
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
      if (mode === "refine") {
        setTexturePrompt("")
      }
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
            <Type className="h-5 w-5 text-primary" />
            {mode === "preview" ? "文本生成3D模型" : "精细化生成"}
          </div>
          {mode === "preview" && (
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
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 文本输入 */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              {mode === "preview" ? "描述文本" : "精细化提示"}
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "preview" 
                ? "请详细描述您想要生成的3D模型，例如：一只可爱的卡通猫咪，坐着的姿势，橙色毛发，大眼睛..."
                : "请描述您想要的精细化效果，例如：增加更多细节，提高表面质感..."
              }
              className="min-h-[120px] bg-input/50"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {mode === "preview" 
                ? "提示：这将生成一个预览版本的模型。生成完成后，您可以在任务详情页面进行精细化处理，添加贴图和材质。"
                : "提示：描述您想要改进的具体方面"
              }
            </p>
          </div>

          {mode === "preview" ? (
            <>
              {/* 预览模式选项 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="art-style">艺术风格</Label>
                      <p className="text-xs text-muted-foreground">
                        选择模型的整体风格
                      </p>
                    </div>
                    <Select
                      value={artStyle}
                      onValueChange={(value: "realistic" | "sculpture") => setArtStyle(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="art-style" className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">写实风格</SelectItem>
                        <SelectItem value="sculpture">雕塑风格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 高级选项 */}
              {isAdvancedMode && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="seed">随机种子</Label>
                      <Input
                        id="seed"
                        type="number"
                        value={seed || ""}
                        onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
                        placeholder="留空为随机"
                        className="bg-input/50"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        设置固定的随机种子可以在使用相同提示词时生成相似的结果
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topology">拓扑结构</Label>
                      <Select value={topology} onValueChange={(value: "quad" | "triangle") => setTopology(value)} disabled={isLoading}>
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

                    <div className="col-span-2 flex items-center justify-between">
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
            </>
          ) : (
            <>
              {/* 精细化模式选项 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
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
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="texture-prompt">贴图提示文本</Label>
                    <Textarea
                      id="texture-prompt"
                      value={texturePrompt}
                      onChange={(e) => setTexturePrompt(e.target.value)}
                      placeholder="可选：为模型提供额外的贴图生成提示，例如：金属质感的表面，带有磨损的痕迹..."
                      className="bg-input/50"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      提供额外的文本提示以引导贴图生成过程（可选）
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

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
                {mode === "preview" ? "开始生成" : "开始精细化"}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
