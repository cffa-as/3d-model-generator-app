"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { ApiService, API_BASE_URL } from "@/lib/api"

// 动态导入3D预览组件
const ThreeModelViewer = dynamic(
  () => import("@/components/tasks/three-model-viewer").then(mod => mod.ThreeModelViewer),
  { ssr: false }
)

interface ModelViewerProps {
  modelUrl?: string
  model_urls?: {
    glb?: string
    obj?: string
    fbx?: string
    usdz?: string
    [key: string]: string | undefined
  }
  textureUrls?: {
    base_color?: string
    metallic?: string
    normal?: string
    roughness?: string
  }
  thumbnail?: string
}

export function ModelViewer({
  modelUrl,
  model_urls,
  textureUrls,
  thumbnail,
}: ModelViewerProps) {
  const [showModelViewer, setShowModelViewer] = useState(false)

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              3D模型预览
            </span>
            {model_urls?.glb && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModelViewer(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 3D模型预览区域 */}
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg flex items-center justify-center relative overflow-hidden">
            {modelUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="3D模型预览"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <div className="h-16 w-16 text-primary mx-auto mb-4 animate-float">🎮</div>
                    <p className="text-muted-foreground">3D模型预览</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50">🎮</div>
                <p className="text-muted-foreground">等待模型生成</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3D模型查看器 */}
      {showModelViewer && model_urls?.glb && (
        <ThreeModelViewer
          modelUrl={model_urls.glb}
          onClose={() => setShowModelViewer(false)}
        />
      )}
    </>
  )
}
