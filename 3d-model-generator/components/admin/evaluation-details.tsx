import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface EvaluationDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: {
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
  } | null
}

export function EvaluationDetails({ open, onOpenChange, details }: EvaluationDetailsProps) {
  const getScoreClass = (score: number) => {
    if (score >= 7) return "bg-green-500/20 text-green-500"
    if (score >= 4) return "bg-yellow-500/20 text-yellow-500"
    return "bg-red-500/20 text-red-500"
  }

  if (!details) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>模型评估详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">基本信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">顶点数：</span>
                <span className="font-medium">{details.basic_info.vertex_count.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">面片数：</span>
                <span className="font-medium">{details.basic_info.face_count.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">表面积：</span>
                <span className="font-medium">{details.basic_info.surface_area.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">评估时间：</span>
                <span className="font-medium">
                  {new Date(details.basic_info.evaluation_date).toLocaleString("zh-CN")}
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
                <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(details.normal_analysis.score)}`}>
                  {details.normal_analysis.score.toFixed(2)}分
                </div>
              </div>
              <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                <p>• 非流形边缘检查：{details.normal_analysis.consistency.toFixed(3)}</p>
                <p>• 顶点重叠检查：{details.mesh_quality.aspect_ratio.toFixed(2)}</p>
                <p>• 面片连接性：{details.completeness.is_watertight ? "是" : "否"}</p>
              </div>
            </div>

            {/* 几何准确度 */}
            <div className="space-y-2 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-base">几何准确度 (35%)</h4>
                <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(details.mesh_quality.score)}`}>
                  {details.mesh_quality.score.toFixed(2)}分
                </div>
              </div>
              <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                <p>• 法线连续性：{details.normal_analysis.consistency.toFixed(3)}</p>
                <p>• 边长比：{details.mesh_quality.aspect_ratio.toFixed(2)}</p>
                <p>• 体积检查：{details.completeness.is_volume ? "合格" : "不合格"}</p>
              </div>
            </div>

            {/* 渲染效率 */}
            <div className="space-y-2 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-base">渲染效率 (30%)</h4>
                <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreClass(details.detail_preservation.score)}`}>
                  {details.detail_preservation.score.toFixed(2)}分
                </div>
              </div>
              <div className="text-sm space-y-1 mt-2 p-2 bg-muted/30 rounded">
                <p>• 面片数量：{details.basic_info.face_count.toLocaleString()}</p>
                <p>• 顶点密度：{details.detail_preservation.vertex_density.toFixed(2)}</p>
                <p>• 边界边比例：{(details.completeness.boundary_ratio * 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* 最终得分 */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">最终得分</span>
                <div className={`px-4 py-2 rounded text-2xl font-bold ${getScoreClass(details.final_score)}`}>
                  {details.final_score.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 