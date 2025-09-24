"use client"

import { Suspense, useEffect, useState, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2, AlertCircle } from "lucide-react"
import type { Group, Object3D } from "three"
import React from 'react'
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
  
  // 使用代理URL
  const proxyUrl = useMemo(() => {
    if (!taskId) return url
    return `${API_BASE_URL}/tasks/proxy/model/${taskId}`
  }, [taskId, url])

  // 加载模型
  useEffect(() => {
    const loadModel = async () => {
      try {
        const response = await fetch(proxyUrl, {
          headers: ApiService.getAuthHeaders()
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        
        // 动态导入加载器
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
        const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js')
        
        const loader = new GLTFLoader()
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
        loader.setDRACOLoader(dracoLoader)

        // 解析模型
        const loadedGltf = await new Promise<GLTF>((resolve, reject) => {
          loader.parse(buffer, '', resolve, reject)
        })

        setGltf(loadedGltf)
        setIsLoading(false)
      } catch (err) {
        console.error("Failed to load model:", err)
        setError("模型加载失败，请稍后重试")
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    loadModel()
  }, [proxyUrl])

  if (error || isLoading || !gltf) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={error ? "#ff4444" : "#666666"} 
            opacity={0.7} 
            transparent 
          />
        </mesh>
      </group>
    )
  }

  return <primitive object={gltf.scene} />
}

export function ThreeModelViewer({ modelUrl, onClose }: { modelUrl: string; onClose?: () => void }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 从URL中提取任务ID
  const taskId = useMemo(() => {
    try {
      const url = new URL(modelUrl)
      const pathParts = url.pathname.split('/')
      return pathParts[pathParts.indexOf('tasks') + 1]
    } catch (e) {
      console.error('Failed to extract task ID:', e)
      return null
    }
  }, [modelUrl])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm">
      <div className="fixed inset-4 z-50 bg-white rounded-lg border shadow-lg overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="outline"
            size="icon"
            className="bg-white/50 backdrop-blur-sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="bg-white/50 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 3D 场景 */}
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            style={{ width: "100%", height: "100%", background: "#ffffff" }}
            onError={(e) => {
              console.error("Canvas error:", e)
              setError("渲染3D模型时发生错误")
            }}
          >
            <color attach="background" args={["#ffffff"]} />
            <ambientLight intensity={1} />
            <Model url={modelUrl} taskId={taskId} />
            <OrbitControls
              autoRotate
              autoRotateSpeed={0.5}
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={10}
            />
          </Canvas>
        </Suspense>

        {/* 操作提示 */}
        <div className="absolute bottom-4 left-4 text-sm text-gray-600 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p>左键拖动：旋转模型</p>
          <p>右键拖动：平移视角</p>
          <p>滚轮：缩放模型</p>
        </div>
      </div>
    </div>
  )
} 