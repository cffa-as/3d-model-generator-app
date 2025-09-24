"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskProgressProps {
  status: "pending" | "completed" | "failed"
  progress: number
  error?: string
  className?: string
}

export function TaskProgress({
  status,
  progress,
  error,
}: TaskProgressProps) {
  return (
    <Card className="glass">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "pending" && <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />}
            {status === "completed" && <CheckCircle className="h-4 w-4 text-green-400" />}
            {status === "failed" && <AlertCircle className="h-4 w-4 text-red-400" />}
            <span className="font-medium">
              {status === "pending" && "生成中"}
              {status === "completed" && "已完成"}
              {status === "failed" && "生成失败"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>

          <Progress
            value={progress}
            className="h-2"
          data-indicator-class={cn(
              status === "completed" && "bg-green-400",
              status === "failed" && "bg-red-400",
            status === "pending" && "bg-yellow-400"
            )}
          />

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
