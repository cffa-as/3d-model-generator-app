import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TaskInfoProps {
  task: {
    task_id: string
    status: "pending" | "completed" | "failed"
    created_at: string
    started_at?: number
    finished_at?: number
  }
}

export default function TaskInfo({ task }: TaskInfoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime || !endTime) return "未知"
    const duration = Math.round((endTime - startTime) / 1000)
    if (duration < 60) return `${duration}秒`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}分${seconds}秒`
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>任务信息</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">任务ID：</span>
            <span className="font-mono">{task.task_id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">状态：</span>
            <span
              className={
                task.status === "completed"
                  ? "text-green-400"
                  : task.status === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
              }
            >
              {task.status === "pending" ? "生成中" : task.status === "completed" ? "已完成" : "失败"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间：</span>
            <span>{formatDate(task.created_at)}</span>
          </div>
          {task.finished_at && (
            <div>
              <span className="text-muted-foreground">用时：</span>
              <span>{formatDuration(task.started_at, task.finished_at)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 