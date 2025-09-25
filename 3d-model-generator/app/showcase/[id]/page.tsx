"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ApiService, API_BASE_URL } from "@/lib/api"
import { EmbeddedModelViewer } from "@/components/showcase/embedded-model-viewer"
import { ThreeModelViewer } from "@/components/tasks/three-model-viewer"
import { Heart, ArrowLeft, Download, Trash2 } from "lucide-react"

interface User {
  user_id: number
  username: string
  is_admin: boolean
}

interface ShowcaseModel {
  id: number
  user_id: number
  username: string
  title: string
  description: string
  category: string
  tags: string[]
  preview_url: string
  model_url: string
  likes: number
  views: number
  status: string
  created_at: string
  updated_at: string
  is_liked?: boolean
  comment_count: number
}

interface ModelComment {
  id: number
  user_id: number
  username: string
  content: string
  created_at: string
}

function ModelDetailContent({ modelId }: { modelId: string }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [model, setModel] = useState<ShowcaseModel | null>(null)
  const [comments, setComments] = useState<ModelComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [showFullscreenViewer, setShowFullscreenViewer] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      loadModelDetails()
    }
  }, [modelId, user, isLoading])

  const loadModelDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/showcase/models/${modelId}`, {
        headers: user
          ? ApiService.getAuthHeaders()
          : {
              "Content-Type": "application/json",
            },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setModel(null)
          toast({
            title: "模型不存在",
            description: "该模型可能已被删除或移动到其他位置",
            variant: "destructive",
          })
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return
      }

      const data = await response.json()
      if (!data.model) {
        setModel(null)
        toast({
          title: "模型不存在",
          description: "该模型可能已被删除或移动到其他位置",
          variant: "destructive",
        })
        return
      }

      setModel(data.model)
      loadComments()
    } catch (error) {
      console.error("加载模型详情失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载模型详情，请稍后重试",
        variant: "destructive",
      })
      setModel(null)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${modelId}/comments`, {
        headers: user
          ? ApiService.getAuthHeaders()
          : {
              "Content-Type": "application/json",
            },
      })
      if (!response.ok) {
        throw new Error("加载评论失败")
      }
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("加载评论失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载评论，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleLike = async () => {
    if (!model || !user) return

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${model.id}/like`, {
        method: "POST",
        headers: ApiService.getAuthHeaders(),
      })

      if (response.ok) {
        setModel((prev) =>
          prev
            ? {
                ...prev,
                likes: prev.is_liked ? prev.likes - 1 : prev.likes + 1,
                is_liked: !prev.is_liked,
              }
            : null,
        )
      }
    } catch (error) {
      console.error("点赞失败:", error)
      toast({
        title: "操作失败",
        description: "点赞操作失败，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleComment = async () => {
    if (!model || !newComment.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${model.id}/comments`, {
        method: "POST",
        headers: {
          ...ApiService.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        const newComment = await response.json()
        // 直接将新评论添加到列表中
        setComments(prev => [newComment, ...prev])
        setNewComment("")
        toast({
          title: "评论成功",
          description: "您的评论已发布",
        })
      } else {
        throw new Error("评论发布失败")
      }
    } catch (error) {
      console.error("评论失败:", error)
      toast({
        title: "评论失败",
        description: "发布评论失败，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/comments/${commentId}`, {
        method: "DELETE",
        headers: ApiService.getAuthHeaders(),
      })

      if (response.ok) {
        // 直接从本地状态中移除被删除的评论
        setComments(comments.filter(comment => comment.id !== commentId))
        toast({
          title: "删除成功",
          description: "评论已被删除",
        })
      } else {
        throw new Error("删除失败")
      }
    } catch (error) {
      console.error("删除评论失败:", error)
      toast({
        title: "删除失败",
        description: "无法删除评论，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const handleDownloadModel = async () => {
    if (!model) return

    try {
      // 使用代理URL下载模型
      const proxyUrl = model.model_url.includes("tasks") 
        ? `${API_BASE_URL}/tasks/proxy/model/${model.model_url.split("/tasks/")[1].split("/")[0]}`
        : model.model_url

      const response = await fetch(proxyUrl, {
        headers: ApiService.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error("下载失败")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${model.title}.glb` // 使用模型标题作为文件名
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "下载成功",
        description: "模型文件已开始下载",
      })
    } catch (error) {
      console.error("下载模型失败:", error)
      toast({
        title: "下载失败",
        description: "无法下载模型文件，请稍后重试",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={() => router.push("/showcase")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回模型广场
          </Button>

          <Card className="p-6">
            <div className="text-center py-12">
              <div className="mb-4">
                <img src="/placeholder.svg" alt="Not Found" className="w-24 h-24 mx-auto opacity-50" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">模型不存在</h2>
              <p className="text-muted-foreground mb-6">该模型可能已被删除或移动到其他位置</p>
              <Button onClick={() => router.push("/showcase")}>返回模型广场</Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => router.push("/showcase")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回模型广场
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：3D模型预览 */}
          <div className="lg:flex-1 min-h-[600px]">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {model && (
                  <EmbeddedModelViewer
                    modelUrl={model.model_url}
                    onFullscreen={() => setShowFullscreenViewer(true)}
                    className="h-full min-h-[600px]"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：模型信息和评论区 */}
          <div className="lg:w-[400px] xl:w-[450px] space-y-6 flex-shrink-0">
            {/* 模型信息 */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold mb-2">{model?.title}</h1>
                <p className="text-muted-foreground mb-4">{model?.description}</p>
                
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" size="sm" onClick={handleLike} disabled={!user}>
                    <Heart className={`h-5 w-5 mr-2 ${model?.is_liked ? "fill-red-500 text-red-500" : ""}`} />
                    {model?.likes || 0}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownloadModel}>
                    <Download className="h-5 w-5 mr-2" />
                    下载模型
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {model?.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 评论区 */}
            <Card className="flex-1">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">评论 ({comments.length})</h2>

                {/* 评论输入区 */}
                {user ? (
                  <div className="mb-6">
                    <div className="flex gap-2">
                      <Input
                        placeholder="写下你的评论..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleComment()}
                        className="flex-1"
                      />
                      <Button onClick={handleComment} disabled={!newComment.trim()}>
                        发布
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/auth")}>
                        登录
                      </Button>
                      后即可评论
                    </p>
                  </div>
                )}

                {/* 评论列表 */}
                <div className="space-y-4">
                  {comments.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                      {comments.map((comment) => (
                        <div key={comment.id} className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {comment.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-sm">{comment.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                              {console.log('Comment data:', comment)}
                              {user && Number(user.id) === Number(comment.user_id) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-destructive/10"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed ml-10">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-2xl">💬</span>
                      </div>
                      <p className="text-muted-foreground text-sm">暂无评论，来发表第一条评论吧</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showFullscreenViewer && model && (
          <ThreeModelViewer
            modelUrl={model.model_url}
            onClose={() => setShowFullscreenViewer(false)}
            showFullscreen={true}
          />
        )}
      </div>
    </div>
  )
}

export default function ModelDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <AuthProvider>
      <ModelDetailContent modelId={params.id} />
    </AuthProvider>
  )
}
