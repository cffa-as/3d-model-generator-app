import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Search, Wand2, Type, ImageIcon, Images, Calendar, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

interface ModelListProps {
  models: Array<{
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
  }>
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  onEvaluate: (model: any) => void
}

export function ModelList({
  models,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  onEvaluate
}: ModelListProps) {
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

  return (
    <>
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
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="评估状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待评估</SelectItem>
                <SelectItem value="evaluated">已评估</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
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
            模型评估列表
            <Badge variant="secondary">{models.length} 个模型</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getTaskTypeIcon(model.task_type)}
                    <div>
                      <p className="font-medium">{model.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {getTaskTypeName(model.task_type)} • {model.task_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(model.created_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {model.status === "evaluated" ? (
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
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
                      </div>
                      <Badge variant="secondary" className="bg-green-400/10 text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已评估
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-400/10 text-yellow-400">
                      <Clock className="h-3 w-3 mr-1" />
                      待评估
                    </Badge>
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
                      onClick={() => onEvaluate(model)}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      评估
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {models.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">没有找到匹配的模型</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
} 