"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Wand2 } from "lucide-react"

interface RefineModelDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (params: { enable_pbr: boolean; texture_prompt?: string }) => Promise<void>
  isLoading?: boolean
}

export function RefineModelDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RefineModelDialogProps) {
  const [enablePbr, setEnablePbr] = useState(true)  // 默认启用 PBR 材质
  const [texturePrompt, setTexturePrompt] = useState("")

  const handleConfirm = async () => {
    await onConfirm({
      enable_pbr: enablePbr,
      texture_prompt: texturePrompt || undefined,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>精细化生成</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enable-pbr">启用PBR材质</Label>
              <p className="text-sm text-muted-foreground">
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
              className="resize-none"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              提供额外的文本提示以引导贴图生成过程（可选，最大600字符）
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                开始生成
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 