"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ApiService } from "@/lib/api"
import { Loader2, Sparkles, Type, Settings2, ChevronDown, ChevronUp, AlertCircle, Wand2, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
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
import { useRouter } from "next/navigation"
import { ModelViewer } from "@/components/tasks/model-viewer"  // 添加导入

interface SimilarModel {
  task_id: string
  prompt: string
  creator: string
  similarity: number
  created_at: string
  thumbnail_url?: string
  preview_url: string
}

interface TextGeneratorProps {
  onTaskCreated?: (taskId: string) => void
  mode?: "preview" | "refine"
  previewTaskId?: string
}

interface SimilarModelResult {
  found: boolean;
  similarity?: number;
  task_id?: string;
  prompt?: string;
  created_at?: string;
  model_urls?: {
    glb?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
}

// 添加新的接口定义
interface SimilarModelsResult {
  found: boolean;
  models: SimilarModelResult[];
}

// 添加验证函数
const validatePrompt = (text: string): { isValid: boolean; message?: string } => {
  // 去除多余空格
  const cleaned = text.trim().replace(/\s+/g, ' ');

  // 检查长度
  if (cleaned.length < 2) {
    return { isValid: false, message: "描述文本太短，请详细描述您想要的模型" };
  }
  if (cleaned.length > 200) {
    return { isValid: false, message: "描述文本过长，请精简您的描述" };
  }

  // 检查重复字符
  const repeatedCharsRegex = /(.)\1{4,}/;  // 同一字符重复5次以上
  if (repeatedCharsRegex.test(cleaned)) {
    return { isValid: false, message: "请不要输入重复的字符" };
  }

  // 检查是否全是语气词或感叹词
  const meaninglessRegex = /^[啊哈呀哦嗯呢吧么]+$/;
  if (meaninglessRegex.test(cleaned)) {
    return { isValid: false, message: "请输入有意义的描述文本" };
  }

  // 检查是否包含实际内容（至少包含一个名词或形容词）
  const hasContent = /[一-龥]{1,}[的地得]?[一-龥]+|[a-zA-Z]+\s*[a-zA-Z]+/;
  if (!hasContent.test(cleaned)) {
    return { isValid: false, message: "请描述具体的物体或场景" };
  }

  // 检查标点符号
  const punctuationRegex = /[。，！？；：、]/g;
  const punctuationCount = (cleaned.match(punctuationRegex) || []).length;
  if (punctuationCount > cleaned.length / 4) {
    return { isValid: false, message: "请减少标点符号的使用" };
  }

  return { isValid: true };
};

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
  const [loadingState, setLoadingState] = useState<'idle' | 'checking-similarity' | 'generating'>('idle')
  const [similarModel, setSimilarModel] = useState<SimilarModelResult | null>(null)
  const [showSimilarDialog, setShowSimilarDialog] = useState(false)
  const [error, setError] = useState("")
  
  const [similarModels, setSimilarModels] = useState<SimilarModelResult[]>([])
  const [currentModelIndex, setCurrentModelIndex] = useState(0)

  const { toast } = useToast()
  const router = useRouter()

  // 修改检查相似模型的函数
  const checkSimilarModels = useCallback(async () => {
    try {
      setLoadingState('checking-similarity')
      const result = await ApiService.checkSimilarModels({
        task_type: "text",
        prompt,
        art_style: artStyle,
      }) as SimilarModelsResult  // Add type assertion here
      
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
      return false
    }
  }, [prompt, artStyle])

  // 添加切换模型的函数
  const handleNextModel = () => {
    setCurrentModelIndex((prev) => 
      prev < similarModels.length - 1 ? prev + 1 : 0
    )
  }

  // 获取当前显示的模型
  const currentModel = similarModels[currentModelIndex]

  const handleSubmit = async (e: React.FormEvent, useCachedModel: boolean = true) => {
    e.preventDefault()
    setError("")

    if (!prompt.trim()) {
      setError("请填写文本描述")
      return
    }

    // 如果没有显示过相似模型对话框，先检查
    if (useCachedModel && !showSimilarDialog) {
      const hasSimilar = await checkSimilarModels()
      if (hasSimilar) {
        return
      }
    }

    setIsLoading(true)
    setLoadingState('generating')
    try {
      const result = await ApiService.createTask({
        task_type: "text",
        prompt: prompt.trim(),
        mode,
        art_style: artStyle,
        ...(mode === "preview" ? {
          // 预览模式参数
          ...(isAdvancedMode && {
            seed: seed ?? undefined,  // Convert null to undefined
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
      }, !useCachedModel)  // 如果用户选择不使用缓存，传入false

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
      setLoadingState('idle')
      setShowSimilarDialog(false)
      setSimilarModel(null)
    }
  }

  // 修改生成处理函数
  const handleGenerate = async () => {
    try {
      // 先验证输入
      const validation = validatePrompt(prompt);
      if (!validation.isValid) {
        toast({
          title: "输入无效",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      setError("");

      // 预处理提示词
      const processedPrompt = prompt.trim()
        .replace(/\s+/g, ' ')  // 合并多个空格
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\p{P}]/gu, '');  // 移除特殊字符

      // 先检查相似模型
      const similarResult = await ApiService.checkSimilarModels({
        task_type: "text",
        prompt: processedPrompt,
        art_style: artStyle
      }) as SimilarModelsResult;

      if (similarResult.found && similarResult.models && similarResult.models.length > 0) {
        setSimilarModels(similarResult.models)
        setCurrentModelIndex(0)
        setShowSimilarDialog(true)
        setIsLoading(false)
        return
      }

      // 如果没有相似模型，继续正常生成流程
      await handleSubmit(new Event("submit") as any, false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "生成模型时发生错误")
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "操作时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)  // 确保在任何情况下都会解除加载状态
    }
  }

  // 查看相似模型
  const handleViewSimilar = () => {
    if (currentModel?.task_id) {  // 改用 currentModel
      router.push(`/tasks/${currentModel.task_id}`)
    }
    setShowSimilarDialog(false)
  }

  // 继续生成新模型
  const handleGenerateAnyway = async () => {
    setShowSimilarDialog(false)
    try {
      setIsLoading(true)
      // 直接调用 API，明确指定不使用缓存
      const result = await ApiService.createTask({
        task_type: "text",
        prompt: prompt,
        mode: mode,
        art_style: artStyle,
        // 预览模式参数
        ...(mode === "preview" ? {
          // 高级模式参数
          ...(isAdvancedMode && {
            seed: seed ?? undefined,  // Convert null to undefined
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
      }, false)  // 这里明确传入 false 表示不使用缓存

      if (onTaskCreated) {
        onTaskCreated(result.task_id)
      }

      toast({
        title: "任务创建成功",
        description: "正在生成3D模型，请稍候...",
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "生成模型时发生错误")
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成模型时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  setPrompt(newValue);
                  // 实时验证但不显示错误，只在提交时显示
                  const validation = validatePrompt(newValue);
                  if (!validation.isValid) {
                    setError(validation.message || "");
                  } else {
                    setError("");
                  }
                }}
                placeholder={mode === "preview" 
                  ? "请详细描述您想要生成的3D模型，例如：一只可爱的卡通猫咪，坐着的姿势，橙色毛发，大眼睛..."
                  : "请描述您想要的精细化效果，例如：增加更多细节，提高表面质感..."
                }
                className={cn(
                  "min-h-[120px] bg-input/50",
                  error && "border-red-500"
                )}
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}
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
                </div>
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
            <Button 
              type="submit" 
              disabled={isLoading || !prompt.trim() || loadingState !== 'idle'} 
              onClick={handleGenerate}
              className="w-full"
            >
              {loadingState === 'checking-similarity' ? (
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
                  <Wand2 className="mr-2 h-4 w-4" />
                  立即生成
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
                我们发现一个与您的描述相似 ({((currentModel?.similarity || 0) * 100).toFixed(2)}%) 的模型：
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
