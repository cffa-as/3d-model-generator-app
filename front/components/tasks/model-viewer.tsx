"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Maximize2, Info } from "lucide-react"
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
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-blue-600 flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  点击放大可查看3D模型
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowModelViewer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  查看
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 3D模型预览区域 */}
          <div className="aspect-square bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg flex items-center justify-center relative overflow-hidden group">
            {modelUrl ? (
              <div className="w-full h-full flex items-center justify-center relative">
                {thumbnail ? (
                  <>
                    <img
                      src={thumbnail}
                      alt="3D模型预览"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                    {/* 悬浮的查看3D按钮 */}
                    {model_urls?.glb && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <Button
                          onClick={() => setShowModelViewer(true)}
                          className="opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300 bg-primary/90 hover:bg-primary text-white shadow-lg"
                          size="lg"
                        >
                          <Eye className="h-5 w-5 mr-2" />
                          查看3D模型
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <div className="h-16 w-16 text-primary mx-auto mb-4 animate-float">🎮</div>
                    <p className="text-muted-foreground">3D模型预览</p>
                    {model_urls?.glb && (
                      <Button
                        onClick={() => setShowModelViewer(true)}
                        className="mt-4 bg-primary/90 hover:bg-primary text-white"
                        size="lg"
                      >
                        <Eye className="h-5 w-5 mr-2" />
                        查看3D模型
                      </Button>
                    )}
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
          
          {/* 明显的查看3D模型按钮 */}
          {model_urls?.glb && (
            <div className="mt-4">
              <Button
                onClick={() => setShowModelViewer(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                🎮 查看3D模型
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                支持全方位旋转、缩放和平移操作
              </p>
            </div>
          )}
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
