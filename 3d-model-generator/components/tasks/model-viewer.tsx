"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Eye, Maximize2, Cable as Cube, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthService } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/api"

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
  taskId?: string
}

export function ModelViewer({
  modelUrl,
  model_urls,
  textureUrls,
  thumbnail,
  taskId,
}: ModelViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTexture, setActiveTexture] = useState<string | null>(null)
  const [thumbnailBlob, setThumbnailBlob] = useState<string | null>(null)
  const [error, setError] = useState<string>("")

  const textureTypes = [
    { key: "base_color", label: "基础色", color: "bg-blue-400/10 text-blue-400" },
    { key: "metallic", label: "金属度", color: "bg-gray-400/10 text-gray-400" },
    { key: "normal", label: "法线", color: "bg-purple-400/10 text-purple-400" },
    { key: "roughness", label: "粗糙度", color: "bg-orange-400/10 text-orange-400" },
  ]

  // 加载预览图
  useEffect(() => {
    if (!thumbnail || !taskId) return

    const loadThumbnail = async () => {
      try {
        console.log('开始加载预览图:', taskId)
        const token = AuthService.getToken()
        console.log('使用token:', token?.slice(0, 10) + '...')
        
        const response = await fetch(`${API_BASE_URL}/tasks/preview/${taskId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        if (!response.ok) {
          const error = await response.text()
          throw new Error(`加载预览图失败: ${error}`)
        }
        
        const blob = await response.blob()
        console.log('预览图加载成功, 大小:', blob.size, 'bytes')
        
        const url = URL.createObjectURL(blob)
        setThumbnailBlob(url)
        return () => URL.revokeObjectURL(url)
      } catch (err) {
        console.error('加载预览图失败:', err)
        setError(err instanceof Error ? err.message : '加载预览图失败')
      }
    }

    loadThumbnail()
  }, [thumbnail, taskId])

  const downloadModel = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            3D模型预览
          </span>
          {modelUrl && (
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D模型预览区域 */}
        <div className="aspect-square bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg flex items-center justify-center relative overflow-hidden">
          {modelUrl ? (
            <div className="w-full h-full flex items-center justify-center">
              {thumbnailBlob ? (
                <img
                  src={thumbnailBlob}
                  alt="3D模型预览"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <Cube className="h-16 w-16 text-primary mx-auto mb-4 animate-float" />
                  <p className="text-muted-foreground">3D模型预览</p>
                  <p className="text-xs text-muted-foreground mt-2">点击下载按钮获取模型文件</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Cube className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">等待模型生成</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 font-medium">加载失败</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* 下载选项 */}
        {model_urls && Object.keys(model_urls).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">下载模型</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(model_urls).map(([format, url]) => (
                url && (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    onClick={() => downloadModel(url, `model.${format}`)}
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {format.toUpperCase()}
                  </Button>
                )
              ))}
            </div>
          </div>
        )}

        {/* 贴图预览 */}
        {textureUrls && Object.keys(textureUrls).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">贴图文件</h4>
            <div className="flex flex-wrap gap-2">
              {textureTypes.map(({ key, label, color }) => {
                const url = textureUrls[key as keyof typeof textureUrls]
                if (!url) return null

                return (
                  <Badge
                    key={key}
                    variant="outline"
                    className={cn("cursor-pointer", color)}
                    onClick={() => setActiveTexture(activeTexture === key ? null : key)}
                  >
                    {label}
                  </Badge>
                )
              })}
            </div>

            {/* 贴图预览 */}
            {activeTexture && textureUrls[activeTexture as keyof typeof textureUrls] && (
              <div className="mt-3">
                <img
                  src={textureUrls[activeTexture as keyof typeof textureUrls] || "/placeholder.svg"}
                  alt={`${activeTexture} 贴图`}
                  className="w-full h-32 object-cover rounded-lg border border-border/50"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
