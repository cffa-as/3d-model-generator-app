"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { useAuth, AuthProvider } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ApiService, API_BASE_URL } from "@/lib/api"
import { ThreeModelViewer } from "@/components/tasks/three-model-viewer"
import { Heart, MessageCircle, Eye, Share2, Plus } from "lucide-react"
import { UploadModelDialog } from "@/components/showcase/upload-model-dialog"

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

function ShowcasePageContent() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [models, setModels] = useState<ShowcaseModel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ShowcaseModel | null>(null)
  const [modelDialog, setModelDialog] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [comments, setComments] = useState<ModelComment[]>([])
  const [newComment, setNewComment] = useState("")

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("latest")

  // 分页
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      loadModels()
    }
  }, [user, categoryFilter, sortBy, page])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const loadModels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "20",
        sort_by: sortBy,
      })
      if (categoryFilter !== "all") {
        params.append("category", categoryFilter)
      }

      const response = await fetch(`${API_BASE_URL}/showcase/models?${params}`, {
        headers: ApiService.getAuthHeaders(),
      })
      const data = await response.json()
      setModels((prev) => (page === 1 ? data.models : [...prev, ...data.models]))
      setTotalPages(Math.ceil(data.total / 20))
      setHasMore(page < Math.ceil(data.total / 20))
    } catch (error) {
      console.error("加载模型失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载模型列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (model: ShowcaseModel) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "登录后即可点赞喜欢的模型",
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${model.id}/like`, {
        method: "POST",
        headers: ApiService.getAuthHeaders(),
      })

      if (response.ok) {
        // 更新模型列表中的点赞状态
        setModels((prev) =>
          prev.map((m) => {
            if (m.id === model.id) {
              return {
                ...m,
                likes: m.is_liked ? m.likes - 1 : m.likes + 1,
                is_liked: !m.is_liked,
              }
            }
            return m
          }),
        )

        // 如果当前模型正在预览，也更新它的状态
        if (selectedModel?.id === model.id) {
          setSelectedModel((prev) =>
            prev
              ? {
                  ...prev,
                  likes: prev.is_liked ? prev.likes - 1 : prev.likes + 1,
                  is_liked: !prev.is_liked,
                }
              : null,
          )
        }
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
    if (!selectedModel || !newComment.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${selectedModel.id}/comments`, {
        method: "POST",
        headers: {
          ...ApiService.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        // 重新加载评论
        loadComments(selectedModel.id)
        setNewComment("")
        toast({
          title: "评论成功",
          description: "您的评论已发布",
        })
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

  const loadComments = async (modelId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${modelId}`, {
        headers: ApiService.getAuthHeaders(),
      })
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("加载评论失败:", error)
    }
  }

  const handleModelClick = async (model: ShowcaseModel) => {
    setSelectedModel(model)
    setModelDialog(true)
    loadComments(model.id)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">模型广场</h1>
            <p className="text-muted-foreground mt-1">发现和分享精彩的3D模型作品</p>
          </div>
          {user && (
            <Button onClick={() => setUploadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              分享模型
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="搜索模型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="character">角色模型</SelectItem>
                    <SelectItem value="scene">场景模型</SelectItem>
                    <SelectItem value="prop">道具模型</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">最新发布</SelectItem>
                    <SelectItem value="popular">最多浏览</SelectItem>
                    <SelectItem value="likes">最多点赞</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {models.map((model) => (
              <Card key={model.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {model.preview_url ? (
                    <img
                      src={model.preview_url || "/placeholder.svg"}
                      alt={model.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">无预览图</div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/50 hover:bg-background/80"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(model)
                    }}
                  >
                    <Heart className={`h-5 w-5 ${model.is_liked ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold truncate">{model.title}</h3>
                      <Button variant="ghost" size="sm" onClick={() => handleModelClick(model)}>
                        查看
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" /> {model.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" /> {model.comment_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" /> {model.views}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={loading}
              >
                {loading ? "加载中..." : "加载更多"}
              </Button>
            </div>
          )}
        </div>

        {/* 模型预览对话框 */}
        <Dialog
          open={modelDialog}
          onOpenChange={(open) => {
            setModelDialog(open)
            if (!open) {
              setSelectedModel(null)
              setComments([])
              setNewComment("")
            }
          }}
        >
          <DialogContent className="max-w-[90vw] w-[1200px] h-[80vh] p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl">{selectedModel?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col h-full space-y-4 overflow-hidden">
              {/* 3D模型预览 */}
              <div className="flex-1 min-h-0 bg-muted rounded-lg overflow-hidden">
                {selectedModel && (
                  <ThreeModelViewer
                    modelUrl={selectedModel.model_url}
                    onClose={() => setModelDialog(false)}
                    showFullscreen={false}
                  />
                )}
              </div>

              {/* 模型信息和评论区 */}
              <div className="flex-none h-[200px] overflow-y-auto space-y-4">
                {/* 模型信息 */}
                <div className="space-y-2">
                  <p className="text-muted-foreground">{selectedModel?.description}</p>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectedModel && handleLike(selectedModel)}
                    >
                      <Heart
                        className={`h-5 w-5 mr-2 ${
                          selectedModel?.is_liked ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                      {selectedModel?.likes || 0}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-5 w-5 mr-2" />
                      分享
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel?.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 评论区 */}
                <div className="space-y-4">
                  <h3 className="font-semibold">评论 ({comments.length})</h3>
                  {user ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="写下你的评论..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleComment()}
                      />
                      <Button onClick={handleComment}>发布</Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">登录后即可评论</p>
                  )}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{comment.username}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <UploadModelDialog
          open={uploadDialog}
          onOpenChange={setUploadDialog}
          onSuccess={() => {
            setPage(1)
            loadModels()
          }}
        />
      </div>
    </div>
  )
}

export default function ShowcasePage() {
  return (
    <AuthProvider>
      <ShowcasePageContent />
    </AuthProvider>
  )
}
