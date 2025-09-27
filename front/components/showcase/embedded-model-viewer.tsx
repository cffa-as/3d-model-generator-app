"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, ContactShadows, Html } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Maximize2, Palette, Loader2 } from "lucide-react"
import type { Object3D } from "three"
import { ApiService, API_BASE_URL } from "@/lib/api"

// 定义GLTF类型
interface GLTF {
  scene: Object3D
  scenes: Object3D[]
  animations: any[]
  cameras: any[]
  asset: any
}

function Model({ url, taskId }: { url: string; taskId: string | null }) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [gltf, setGltf] = useState<GLTF | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // 使用代理URL
  const proxyUrl = useMemo(() => {
    if (!taskId) return url
    return `${API_BASE_URL}/tasks/proxy/model/${taskId}`
  }, [taskId, url])

  // 加载模型
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoadingProgress(10)
        const response = await fetch(proxyUrl, {
          headers: ApiService.getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        setLoadingProgress(30)
        const buffer = await response.arrayBuffer()
        setLoadingProgress(50)

        // 动态导入加载器
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
        const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js")

        const loader = new GLTFLoader()
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
        loader.setDRACOLoader(dracoLoader)

        setLoadingProgress(70)
        // 解析模型
        const loadedGltf = await new Promise<GLTF>((resolve, reject) => {
          loader.parse(buffer, "", resolve, reject)
        })

        setLoadingProgress(100)
        setGltf(loadedGltf)
        setIsLoading(false)
      } catch (err) {
        console.error("Failed to load model:", err)
        setError("模型加载失败，请稍后重试")
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    setLoadingProgress(0)
    loadModel()
  }, [proxyUrl])

  if (error || isLoading || !gltf) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial
            color={error ? "#ef4444" : "#e2e8f0"}
            opacity={error ? 0.8 : 0.3}
            transparent
            wireframe={!error}
          />
        </mesh>

        {/* 添加旋转的线框立方体作为加载动画 */}
        {!error && (
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[2.2, 2.2, 2.2]} />
            <meshBasicMaterial color="#3b82f6" wireframe opacity={0.6} transparent />
          </mesh>
        )}

        {/* 改进的加载提示UI */}
        <group position={[0, -2, 0]}>
          <Html center>
            <div className="flex flex-col items-center space-y-3 p-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 min-w-[200px]">
              {error ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <div className="w-4 h-4 bg-red-600 rounded-full" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">加载失败</h3>
                    <p className="text-xs text-gray-600">{error}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900">正在加载模型</h3>
                    <p className="text-xs text-gray-600">请稍候...</p>

                    {/* 进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">{loadingProgress}%</p>
                  </div>
                </>
              )}
            </div>
          </Html>
        </group>
      </group>
    )
  }

  return <primitive object={gltf.scene} />
}

export function EmbeddedModelViewer({
  modelUrl,
  onFullscreen,
  className = "",
}: {
  modelUrl: string
  onFullscreen?: () => void
  className?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [backgroundColor, setBackgroundColor] = useState("#2d3748")  // 修改默认背景色
  const [showColorPicker, setShowColorPicker] = useState(false)

  const backgroundColors = [
    { name: "深灰", color: "#2d3748" },  // 调整顺序，把深灰放在第一位
    { name: "浅灰", color: "#f8f9fa" },
    { name: "白色", color: "#ffffff" },
    { name: "黑色", color: "#000000" },
    { name: "蓝色", color: "#4299e1" },
    { name: "绿色", color: "#48bb78" },
  ]

  // 从URL中提取任务ID
  const taskId = useMemo(() => {
    try {
      const url = new URL(modelUrl)
      const pathParts = url.pathname.split("/")
      return pathParts[pathParts.indexOf("tasks") + 1]
    } catch (e) {
      console.error("Failed to extract task ID:", e)
      return null
    }
  }, [modelUrl])

  return (
    <div className={`relative w-full h-full bg-gray-50 rounded-lg overflow-hidden ${className}`}>
      {/* 顶部工具栏 */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm h-8 w-8 p-0"
            onClick={() => setShowColorPicker(!showColorPicker)}
          >
            <Palette className="h-3 w-3" />
          </Button>

          {showColorPicker && (
            <div className="absolute top-10 right-0 bg-white/95 backdrop-blur-md rounded-lg border shadow-lg p-2 min-w-[160px] text-gray-900 z-20">
              <p className="text-xs font-medium mb-2 text-gray-900">背景颜色</p>
              <div className="grid grid-cols-2 gap-1">
                {backgroundColors.map((bg) => (
                  <button
                    key={bg.color}
                    className={`flex items-center gap-1 p-1.5 rounded hover:bg-gray-100 text-xs text-gray-700 ${
                      backgroundColor === bg.color ? "bg-gray-100 ring-1 ring-gray-200" : ""
                    }`}
                    onClick={() => {
                      setBackgroundColor(bg.color)
                      setShowColorPicker(false)
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded border border-gray-300 ring-1 ring-white/50" 
                      style={{ backgroundColor: bg.color }} 
                    />
                    <span>{bg.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {onFullscreen && (
          <Button
            variant="outline"
            size="sm"
            className="bg-white/80 backdrop-blur-sm h-8 w-8 p-0"
            onClick={onFullscreen}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* 3D 场景 */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="flex flex-col items-center space-y-3 p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">初始化3D场景</h3>
                <p className="text-sm text-gray-600">正在准备渲染环境...</p>
              </div>
            </div>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ width: "100%", height: "100%", background: backgroundColor }}
          onError={(e) => {
            console.error("Canvas error:", e)
            setError("渲染3D模型时发生错误")
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <color attach="background" args={[backgroundColor]} />

          {/* 环境光 - 提供基础照明 */}
          <ambientLight intensity={0.4} />

          {/* 主要方向光 - 模拟太阳光 */}
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />

          {/* 补充光源 - 减少阴影过重 */}
          <directionalLight position={[-5, 5, 5]} intensity={0.3} />

          {/* 点光源 - 增加细节照明 */}
          <pointLight position={[0, 5, 0]} intensity={0.5} />

          {/* 环境贴图 - 提供真实的反射和环境光照 */}
          <Environment preset="studio" />

          {/* 接触阴影 - 让模型看起来更接地气 */}
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={10}
            blur={1}
            far={10}
            resolution={256}
            color="#000000"
          />

          <Model url={modelUrl} taskId={taskId} />
          <OrbitControls
            autoRotate
            autoRotateSpeed={0.5}
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
            target={[0, 0, 0]}
          />
        </Canvas>
      </Suspense>

      {/* 操作提示 */}
      <div className="absolute bottom-2 left-2 text-xs bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
        <p className="text-gray-700">左键旋转 • 右键平移 • 滚轮缩放</p>
      </div>
    </div>
  )
}
