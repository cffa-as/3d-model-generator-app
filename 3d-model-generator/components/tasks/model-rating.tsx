import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ApiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ModelRatingProps {
  taskId: string
  initialRating?: number
  initialComment?: string
  onRatingSubmitted?: () => void
}

export function ModelRating({ taskId, initialRating, initialComment, onRatingSubmitted }: ModelRatingProps) {
  const [rating, setRating] = useState(initialRating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState(initialComment || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "请选择评分",
        description: "请为模型选择1-10分的评分",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await ApiService.rateModel(taskId, rating, comment)
      toast({
        title: "评分成功",
        description: "感谢您的评价！",
      })
      // 立即更新父组件状态
      onRatingSubmitted?.()
    } catch (error) {
      toast({
        title: "评分失败",
        description: error instanceof Error ? error.message : "无法提交评分",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {[...Array(10)].map((_, i) => (
          <button
            key={i}
            className="p-1 focus:outline-none"
            onClick={() => setRating(i + 1)}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hoverRating || rating) > i
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating} 分` : "请评分"}
        </span>
      </div>
      <Textarea
        placeholder="写下您对这个模型的评价（可选）"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="h-24"
      />
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting || rating === 0}
        className="w-full"
      >
        {isSubmitting ? "提交中..." : "提交评分"}
      </Button>
    </div>
  )
} 