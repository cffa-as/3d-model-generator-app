"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { ApiService, API_BASE_URL } from "@/lib/api"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Search,
  Download,
  CheckCircle,
  Clock,
  Calendar,
  Type,
  ImageIcon,
  Images,
  Wand2,
} from "lucide-react"

interface ModelEvaluation {
  id: string
  user_id: string
  username: string
  task_id: string
  task_type: "text" | "image" | "multi_image"
  created_at: string
  status: "pending" | "evaluated"
  topology_score?: number
  geometry_score?: number
  rendering_score?: number
  issues?: string[]
  evaluation_history?: {
    date: string
    evaluator: string
    scores: {
      topology: number
      geometry: number
      rendering: number
    }
    notes: string
  }[]
  user_rating?: number // 新增用户评分
  thumbnail_url?: string // 新增缩略图URL
}

interface EvaluationStats {
  average_topology: number
  average_geometry: number
  average_rendering: number
  min_topology: number
  max_topology: number
  min_geometry: number
  max_geometry: number
  min_rendering: number
  max_rendering: number
  total_evaluated: number
  pending_count: number
  anomaly_count: number
}

interface EvaluationDetails {
  basic_info: {
    vertex_count: number
    face_count: number
    surface_area: number
    evaluation_date: string
  }
  normal_analysis: {
    consistency: number
    score: number
  }
  mesh_quality: {
    aspect_ratio: number
    score: number
  }
  completeness: {
    is_watertight: boolean
    is_volume: boolean
    boundary_ratio: number
    score: number
  }
  detail_preservation: {
    vertex_density: number
    score: number
  }
  final_score: number
  evaluation_log: string
}

// 添加自动评估函数
const autoEvaluateModel = async (modelUrl: string) => {
  try {
    // 1. 拓扑结构质量检测
    const topologyScore = await checkTopology(modelUrl)
    
    // 2. 几何准确度评估
    const geometryScore = await checkGeometry(modelUrl)
    
    // 3. 渲染效率测试
    const renderingScore = await checkRendering(modelUrl)
    
    return {
      topology_score: topologyScore,
      geometry_score: geometryScore,
      rendering_score: renderingScore,
      notes: "自动评估结果",
    }
  } catch (error) {
    console.error("自动评估失败:", error)
    throw error
  }
}

// 添加具体的评估函数
const checkTopology = async (modelUrl: string) => {
  // TODO: 实现拓扑结构检测
  // - 检查非流形边缘
  // - 检查重叠顶点
  // - 计算拓扑评分
  return 8.5 // 临时返回模拟分数
}

const checkGeometry = async (modelUrl: string) => {
  // TODO: 实现几何准确度评估
  // - 计算与参考模型的距离
  // - 检查表面法线连续性
  return 7.8 // 临时返回模拟分数
}

const checkRendering = async (modelUrl: string) => {
  // TODO: 实现渲染效率测试
  // - 测试标准场景帧率
  // - 检查面片数量
  // - 测试内存占用
  return 8.2 // 临时返回模拟分数
}

export function ModelEvaluation() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<EvaluationStats | null>(null)
  const [models, setModels] = useState<ModelEvaluation[]>([])
  const [filteredModels, setFilteredModels] = useState<ModelEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ModelEvaluation | null>(null)
  const [evaluationDialog, setEvaluationDialog] = useState(false)
  const [evaluationDetails, setEvaluationDetails] = useState<EvaluationDetails | null>(null)
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false)
  const [evaluatingModels, setEvaluatingModels] = useState<Set<string>>(new Set())

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // 评估表单状态
  const [evaluationForm, setEvaluationForm] = useState({
    topology_score: 0,
    geometry_score: 0,
    rendering_score: 0,
    notes: "",
  })

  useEffect(() => {
    loadEvaluationData()
  }, [])

  useEffect(() => {
    filterModels()
  }, [models, searchTerm, statusFilter, typeFilter])

  const loadEvaluationData = async () => {
    try {
      setLoading(true)
      // 从任务历史获取所有用户的模型记录
      const response = await fetch(`${API_BASE_URL}/admin/tasks`, {
        headers: {
          ...ApiService.getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      })
      const tasksData = await response.json()
      
      console.log("API返回的任务数据:", tasksData.length, "个任务")
      
      // 转换任务数据为评估模型格式（后端已经只返回已完成的任务）
      const modelData = tasksData.map((task: any) => ({
          id: task.id,
          user_id: task.user_id,
          username: task.username,
          task_id: task.task_id,
          task_type: task.task_type,
          created_at: task.created_at,
          status: task.evaluation_status || "pending",
          topology_score: task.topology_score,
          geometry_score: task.geometry_score,
          rendering_score: task.rendering_score,
          evaluation_history: task.evaluation_history,
          user_rating: task.user_rating,
          thumbnail_url: task.thumbnail_url || task.model_urls?.glb?.replace(/\.glb$/, '.jpg') || null
        }))

      setModels(modelData)
      
      // 计算统计数据
      const stats = calculateStats(modelData)
      setStats(stats)
    } catch (error) {
      console.error("加载评估数据失败:", error)
    } finally {
      setLoading(false)
    }
  }

  // 计算统计数据的辅助函数
  const calculateStats = (models: ModelEvaluation[]): EvaluationStats => {
    const evaluated = models.filter(m => m.status === "evaluated")
    const topology_scores = evaluated.map(m => m.topology_score || 1)  // 使用1作为默认值
    const geometry_scores = evaluated.map(m => m.geometry_score || 1)
    const rendering_scores = evaluated.map(m => m.rendering_score || 1)

    return {
      average_topology: calculateAverage(topology_scores),
      average_geometry: calculateAverage(geometry_scores),
      average_rendering: calculateAverage(rendering_scores),
      min_topology: Math.min(...topology_scores),
      max_topology: Math.max(...topology_scores),
      min_geometry: Math.min(...geometry_scores),
      max_geometry: Math.max(...geometry_scores),
      min_rendering: Math.min(...rendering_scores),
      max_rendering: Math.max(...rendering_scores),
      total_evaluated: evaluated.length,
      pending_count: models.filter(m => m.status === "pending").length,
      anomaly_count: evaluated.filter(m => 
        (m.topology_score || 0) < 4 || 
        (m.geometry_score || 0) < 4 || 
        (m.rendering_score || 0) < 4
      ).length
    }
  }

  const calculateAverage = (numbers: number[]): number => {
    return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0
  }

  const filterModels = () => {
    let filtered = models

    if (searchTerm) {
      filtered = filtered.filter(
        (model) =>
          model.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.task_id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((model) => model.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((model) => model.task_type === typeFilter)
    }

    setFilteredModels(filtered)
  }

  const handleAutoEvaluate = async (model: ModelEvaluation) => {
    try {
      if (evaluatingModels.has(model.task_id)) {
        toast({
          title: "正在评估中",
          description: "请等待当前评估完成",
        })
        return
      }

      setSelectedModel(model)
      setEvaluatingModels(prev => new Set(prev).add(model.task_id))
      
      // 显示评估开始的 toast
      toast({
        title: "开始评估",
        description: "正在下载模型文件并进行评估...",
      })
      
      // 调用评估接口
      const response = await fetch(`${API_BASE_URL}/admin/tasks/${model.task_id}/evaluate`, {
        method: 'POST',
        headers: ApiService.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('评估失败')
      }

      const results = await response.json()
      
      // 更新模型数据
      const updatedModel = {
        ...model,
        status: "evaluated" as const,
        topology_score: Number(results.topology_score),
        geometry_score: Number(results.geometry_score),
        rendering_score: Number(results.rendering_score),
        evaluation_history: [
          ...(model.evaluation_history || []),
          results.evaluation_history
        ],
        user_rating: model.user_rating, // 保留原有的用户评分
        thumbnail_url: model.thumbnail_url // 保留原有的缩略图
      }

      // 更新模型列表
      setModels((prev) => {
        const newModels = prev.map((m) => (m.id === model.id ? updatedModel : m))
        const newStats = calculateStats(newModels)
        setStats(newStats)
        return newModels
      })

      // 转换评估详情的格式
      const details: EvaluationDetails = {
        basic_info: {
          vertex_count: results.details.vertex_count,
          face_count: results.details.face_count,
          surface_area: results.details.surface_area,
          evaluation_date: new Date().toISOString()
        },
        normal_analysis: {
          consistency: results.details.normal_consistency,
          score: results.topology_score
        },
        mesh_quality: {
          aspect_ratio: results.details.aspect_ratio,
          score: results.geometry_score
        },
        completeness: {
          is_watertight: results.details.is_watertight,
          is_volume: results.details.is_volume,
          boundary_ratio: results.details.boundary_ratio,
          score: Number(results.details.completeness_score)  // 确保转换为数字
        },
        detail_preservation: {
          vertex_density: results.details.vertex_density,
          score: results.rendering_score
        },
        final_score: results.details.final_score,
        evaluation_log: results.details.evaluation_log || ""
      }

      setEvaluationDetails(details)
      setShowEvaluationDialog(true)

      toast({
        title: "评估完成",
        description: `模型评分：拓扑 ${results.topology_score.toFixed(1)}，几何 ${results.geometry_score.toFixed(1)}，渲染 ${results.rendering_score.toFixed(1)}`,
      })
    } catch (error) {
      toast({
        title: "评估失败",
        description: error instanceof Error ? error.message : "自动评估失败，请稍后重试",
        variant: "destructive",
      })
    } finally {
      setEvaluatingModels(prev => {
        const next = new Set(prev)
        next.delete(model.task_id)
        return next
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/tasks/export`, {
        headers: ApiService.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition?.split('filename=')[1] || 'evaluation_report.csv'

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "导出成功",
        description: "评估报告已下载",
      })
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出评估报告失败，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "multi_image":
        return <Images className="h-4 w-4" />
      default:
        return <Type className="h-4 w-4" />
    }
  }

  const getTaskTypeName = (type: string) => {
    switch (type) {
      case "text":
        return "文本生成"
      case "image":
        return "图片生成"
      case "multi_image":
        return "多图生成"
      default:
        return "未知类型"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-green-400"
    if (score >= 3.5) return "text-yellow-400"
    return "text-red-400"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">模型评估系统</h2>
        <div className="flex items-center gap-3">
          <Button 
            size="default"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            onClick={async () => {
              try {
                const pendingModels = models.filter(m => m.status === "pending");
                if (pendingModels.length === 0) {
                  toast({
                    title: "无需评估",
                    description: "没有待评估的模型",
                  });
                  return;
                }

                toast({
                  title: "开始评估",
                  description: `正在评估 ${pendingModels.length} 个模型...`,
                });

                // 并行评估所有待评估模型
                await Promise.all(pendingModels.map(model => handleAutoEvaluate(model)));

                toast({
                  title: "评估完成",
                  description: `成功评估 ${pendingModels.length} 个模型`,
                });
              } catch (error) {
                toast({
                  title: "评估失败",
                  description: "批量评估过程中出现错误",
                  variant: "destructive",
                });
              }
            }}
          >
            <Wand2 className="h-5 w-5 mr-2" />
            一键评估
          </Button>
          <Button 
            size="default"
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            onClick={handleExport}
          >
            <Download className="h-5 w-5 mr-2" />
            导出报告
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">总体评估</TabsTrigger>
          <TabsTrigger value="models">模型列表</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <>
              {/* 平均评分卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">拓扑结构质量</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${(stats.average_topology / 10) * 226} 226`}
                            className="text-purple-400"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">{stats.average_topology.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">
                        最高: {stats.max_topology.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        最低: {stats.min_topology.toFixed(1)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">几何准确度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${(stats.average_geometry / 10) * 226} 226`}
                            className="text-green-400"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">{stats.average_geometry.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">
                        最高: {stats.max_geometry.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        最低: {stats.min_geometry.toFixed(1)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">渲染效率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${(stats.average_rendering / 10) * 226} 226`}
                            className="text-blue-400"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">{stats.average_rendering.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">
                        最高: {stats.max_rendering.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        最低: {stats.min_rendering.toFixed(1)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 统计概览 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">已评估模型</p>
                        <p className="text-2xl font-bold text-green-400">{stats.total_evaluated}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">待评估模型</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.pending_count}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">异常模型</p>
                        <p className="text-2xl font-bold text-red-400">{stats.anomaly_count}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {/* 筛选控件 */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户名或任务ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="评估状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">未评估</SelectItem>
                    <SelectItem value="evaluated">已评估</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="模型类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="text">文本生成</SelectItem>
                    <SelectItem value="image">图片生成</SelectItem>
                    <SelectItem value="multi_image">多图生成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 模型列表 */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                已完成模型列表
                <Badge variant="secondary">{filteredModels.length} 个模型</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredModels
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* 预览图 */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {model.thumbnail_url ? (
                          <img
                            src={model.thumbnail_url}
                            alt={`${model.username}的模型`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      {/* 标题和任务信息 */}
                      <div className="flex items-center gap-6 min-w-0">
                        <div className="flex items-center gap-2 w-[240px]">
                          {getTaskTypeIcon(model.task_type)}
                          <div className="truncate">
                            <p className="font-medium truncate">{model.username}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {getTaskTypeName(model.task_type)} • {model.task_id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                          <Calendar className="h-4 w-4" />
                          {new Date(model.created_at).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {model.status === "evaluated" ? (
                        <div className="flex items-center gap-2">
                          <div className="text-sm whitespace-nowrap">
                            <span className={`font-medium ${getScoreColor(model.topology_score || 0)}`}>
                              拓扑: {model.topology_score?.toFixed(1)}
                            </span>
                            <span className="mx-2">•</span>
                            <span className={`font-medium ${getScoreColor(model.geometry_score || 0)}`}>
                              几何: {model.geometry_score?.toFixed(1)}
                            </span>
                            <span className="mx-2">•</span>
                            <span className={`font-medium ${getScoreColor(model.rendering_score || 0)}`}>
                              渲染: {model.rendering_score?.toFixed(1)}
                            </span>
                            {model.user_rating !== null && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="font-medium text-yellow-400">
                                  用户评分: {Number(model.user_rating).toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>
                          <Badge variant="secondary" className="bg-green-400/10 text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已评估
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-400/10 text-yellow-400">
                            <Clock className="h-3 w-3 mr-1" />
                            待评估
                          </Badge>
                          {model.user_rating !== null && (
                            <div className="text-sm whitespace-nowrap">
                              <span className="font-medium text-yellow-400">
                                用户评分: {Number(model.user_rating).toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tasks/${model.task_id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAutoEvaluate(model)}
                          disabled={evaluatingModels.has(model.task_id)}
                        >
                          {evaluatingModels.has(model.task_id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                              评估中
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-1" />
                              评估
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredModels.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">没有找到匹配的模型</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 评估详情对话框 */}
      <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>模型评估详情</DialogTitle>
          </DialogHeader>

          {evaluationDetails && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">基本信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">顶点数：</span>
                    <span className="font-medium">{evaluationDetails.basic_info.vertex_count.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">面片数：</span>
                    <span className="font-medium">{evaluationDetails.basic_info.face_count.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">表面积：</span>
                    <span className="font-medium">{evaluationDetails.basic_info.surface_area.toFixed(2)}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">评估时间：</span>
                    <span className="font-medium">
                      {new Date(evaluationDetails.basic_info.evaluation_date).toLocaleString("zh-CN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 评分详情 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">评分详情</h3>
                
                {/* 拓扑结构 */}
                <div className="space-y-2 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-base">拓扑结构 (35%)</h4>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      evaluationDetails.normal_analysis.score >= 7 ? "bg-green-500/20 text-green-500" :
                      evaluationDetails.normal_analysis.score >= 4 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {evaluationDetails.normal_analysis.score.toFixed(2)}分
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                    <p>• 非流形边缘检查：{evaluationDetails.normal_analysis.consistency.toFixed(3)}</p>
                    <p>• 顶点重叠检查：{evaluationDetails.mesh_quality.aspect_ratio.toFixed(2)}</p>
                    <p>• 面片连接性：{evaluationDetails.completeness.is_watertight ? "是" : "否"}</p>
                  </div>
                </div>

                {/* 几何准确度 */}
                <div className="space-y-2 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-base">几何准确度 (35%)</h4>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      evaluationDetails.mesh_quality.score >= 7 ? "bg-green-500/20 text-green-500" :
                      evaluationDetails.mesh_quality.score >= 4 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {evaluationDetails.mesh_quality.score.toFixed(2)}分
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                    <p>• 法线连续性：{evaluationDetails.normal_analysis.consistency.toFixed(3)}</p>
                    <p>• 边长比：{evaluationDetails.mesh_quality.aspect_ratio.toFixed(2)}</p>
                    <p>• 体积检查：{evaluationDetails.completeness.is_volume ? "合格" : "不合格"}</p>
                  </div>
                </div>

                {/* 渲染效率 */}
                <div className="space-y-2 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-base">渲染效率 (30%)</h4>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      evaluationDetails.detail_preservation.score >= 7 ? "bg-green-500/20 text-green-500" :
                      evaluationDetails.detail_preservation.score >= 4 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {evaluationDetails.detail_preservation.score.toFixed(2)}分
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                    <p>• 面片数量：{evaluationDetails.basic_info.face_count.toLocaleString()}</p>
                    <p>• 顶点密度：{evaluationDetails.detail_preservation.vertex_density.toFixed(2)}</p>
                    <p>• 边界边比例：{(evaluationDetails.completeness.boundary_ratio * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* 最终得分 */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">最终得分</span>
                    <div className={`px-4 py-2 rounded text-2xl font-bold ${
                      evaluationDetails.final_score >= 7 ? "bg-green-500/20 text-green-500" :
                      evaluationDetails.final_score >= 4 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {evaluationDetails.final_score.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
