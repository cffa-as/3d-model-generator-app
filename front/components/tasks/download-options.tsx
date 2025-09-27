import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DownloadOptionsProps {
  task: {
    model_urls?: {
      glb?: string
      obj?: string
      fbx?: string
      usdz?: string
    }
  }
}

export default function DownloadOptions({ task }: DownloadOptionsProps) {
  const downloadModel = (url: string, filename: string) => {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!task.model_urls || Object.keys(task.model_urls).length === 0) {
    return null
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>下载模型</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {Object.entries(task.model_urls).map(
            ([format, url]) =>
              url && (
                <Button
                  key={format}
                  variant="outline"
                  size="sm"
                  onClick={() => downloadModel(url, `model.${format}`)}
                  className="text-xs hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {format.toUpperCase()}
                </Button>
              ),
          )}
        </div>
      </CardContent>
    </Card>
  )
} 