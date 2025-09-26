import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface ScoreCardProps {
  title: string
  score: number
  maxScore: number
  minScore: number
  color: string
}

export function ScoreCard({ title, score, maxScore, minScore, color }: ScoreCardProps) {
  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
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
                strokeDasharray={`${(score / 10) * 226} 226`}
                className={color}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{score.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            最高: {maxScore.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            最低: {minScore.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 