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
import { Heart, MessageCircle, Eye, Share2, Plus, Trophy, User, Trash2 } from "lucide-react"
import { UploadModelDialog } from "@/components/showcase/upload-model-dialog"
import { DesignerLeaderboard } from "@/components/showcase/designer-leaderboard";
import { cn } from "@/lib/utils";

interface User {
  user_id: number;
  username: string;
  email?: string;
}

type SortByType = "latest" | "popular" | "likes"

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
  const [filteredModels, setFilteredModels] = useState<ShowcaseModel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ShowcaseModel | null>(null)
  const [modelDialog, setModelDialog] = useState(false)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [comments, setComments] = useState<ModelComment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [designers, setDesigners] = useState([])
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<ShowcaseModel | null>(null)

  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortByType>("latest")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [popularTags, setPopularTags] = useState<Array<{tag: string, count: number}>>([])

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
      setPage(1)  // 重置页码
      setModels([])  // 清空现有数据
      setFilteredModels([])  // 清空过滤数据
      loadModels()
      loadPopularTags()
    }
  }, [user, categoryFilter, sortBy])

  // 处理分类切换
  const handleCategoryChange = (newCategory: string) => {
    setPage(1)  // 重置页码
    if (newCategory === categoryFilter) {
      setCategoryFilter("all")
    } else {
      setCategoryFilter(newCategory)
    }
  }

  // 处理普通分类切换
  const handleNormalCategoryChange = (newCategory: string) => {
    setPage(1)  // 重置页码
    setCategoryFilter(newCategory)
  }

  // 搜索和标签过滤效果
  useEffect(() => {
    if (!models) return
    
    if (searchTerm.trim() === "" && !selectedTag) {
      setFilteredModels(models)
    } else {
      const searchLower = searchTerm.toLowerCase()
      const filtered = models.filter(model => {
        const matchesSearch = searchTerm.trim() === "" || 
          model.title.toLowerCase().includes(searchLower) ||
          model.description.toLowerCase().includes(searchLower)
        const matchesTag = !selectedTag || model.tags.includes(selectedTag)
        return matchesSearch && matchesTag
      })
      setFilteredModels(filtered)
    }
  }, [searchTerm, models, selectedTag])

  // 加载更多时的效果
  useEffect(() => {
    if (page > 1) {
      loadModels()
    }
  }, [page])

  const fetchLeaderboard = async () => {
    try {
      setIsLeaderboardLoading(true);
      const response = await fetch(`${API_BASE_URL}/showcase/designers/leaderboard`, {
        headers: ApiService.getAuthHeaders(),
      });
      if (!response.ok) {
        console.error("Leaderboard API error:", await response.text());
        throw new Error("Failed to fetch leaderboard");
      }
      const data = await response.json();
      setDesigners(data.designers || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast({
        title: "获取排行榜失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (isLeaderboardOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardOpen]);

  const loadPopularTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/showcase/tags/popular`, {
        headers: ApiService.getAuthHeaders(),
      })
      const data = await response.json()
      setPopularTags(data.tags || [])
    } catch (error) {
      console.error("加载热门标签失败:", error)
    }
  }

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

      // 根据不同的筛选条件设置不同的API端点
      let endpoint = `${API_BASE_URL}/showcase/models`
      if (categoryFilter === "liked") {
        endpoint = `${API_BASE_URL}/showcase/liked-models`  // Updated endpoint
      } else if (categoryFilter === "my") {
        endpoint = `${API_BASE_URL}/showcase/my-models`  // Updated endpoint
      }

      // 构建查询参数
      const queryParams = `page=${parseInt(page.toString())}&page_size=${parseInt('20')}&sort_by=${sortBy}${
        categoryFilter !== "all" && categoryFilter !== "liked" && categoryFilter !== "my" ? 
        `&category=${categoryFilter}` : 
        ""
      }`
      const fullUrl = `${endpoint}?${queryParams}`

      console.log("发送请求:", {
        url: fullUrl,
        headers: ApiService.getAuthHeaders()
      })

      const response = await fetch(fullUrl, {
        headers: ApiService.getAuthHeaders(),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("请求失败:", {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData, null, 2),
        })
        const errorMessage = errorData?.detail?.[0]?.msg || 
                             errorData?.detail || 
                             `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      
      // 根据页码决定是追加还是替换数据
      const newModels = page === 1 ? data.models : [...(models || []), ...(data.models || [])]
      setModels(newModels)
      
      // 如果没有搜索词和标签筛选，直接更新过滤后的数据
      if (!searchTerm.trim() && !selectedTag) {
        setFilteredModels(newModels)
      }
      
      setTotalPages(Math.ceil(data.total / 20))
      setHasMore(page < Math.ceil(data.total / 20))
    } catch (error) {
      console.error("加载模型失败:", error)
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "无法加载模型列表",
        variant: "destructive",
      })
      // 发生错误时重置状态
      if (page === 1) {
        setModels([])
        setFilteredModels([])
      }
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

  const handleDeleteModel = async (model: ShowcaseModel) => {
    if (!user || model.user_id !== user.id) {
      toast({
        title: "权限不足",
        description: "您只能删除自己的模型",
        variant: "destructive",
      });
      return;
    }

    setModelToDelete(model)
    setDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!modelToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/showcase/models/${modelToDelete.id}`, {
        method: "DELETE",
        headers: ApiService.getAuthHeaders(),
      });

      if (response.ok) {
        toast({
          title: "删除成功",
          description: "模型已删除",
        });
        setPage(1); // 重新加载第一页
        loadModels();
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail?.[0]?.msg ||
                           errorData?.detail ||
                           `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("删除模型失败:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除模型",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog(false)
      setModelToDelete(null)
    }
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
            <p className="text-muted-foreground mt-1">分享和探索精美的虚拟手办和3D模型作品，让创意在这里绽放</p>
          </div>
          <div className="flex gap-2">
            {user && (
              <>
                <Button 
                  onClick={() => setIsLeaderboardOpen(true)}
                  disabled={isLeaderboardLoading}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  设计师排行榜
                </Button>
                <Button onClick={() => setUploadDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  分享模型
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="搜索模型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <div className="flex gap-2">
                  <Button
                    variant={categoryFilter === "liked" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 px-4 gap-2 font-medium transition-all duration-200",
                      categoryFilter === "liked" && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => handleCategoryChange("liked")}
                  >
                    <Heart className={cn(
                      "h-4 w-4",
                      categoryFilter === "liked" && "fill-current"
                    )} />
                    我的收藏
                  </Button>
                  <Button
                    variant={categoryFilter === "my" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 px-4 gap-2 font-medium transition-all duration-200",
                      categoryFilter === "my" && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => handleCategoryChange("my")}
                  >
                    <User className="h-4 w-4" />
                    我的作品
                  </Button>
                </div>
                <Select value={sortBy} onValueChange={(value: SortByType) => setSortBy(value)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="排序方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">最新发布</SelectItem>
                    <SelectItem value="popular">最多浏览</SelectItem>
                    <SelectItem value="likes">最多点赞</SelectItem>
                  </SelectContent>
                </Select>
                <div className={cn("transition-all duration-200", 
                  categoryFilter === "liked" || categoryFilter === "my" ? "opacity-50 pointer-events-none" : "opacity-100"
                )}>
                  <Select 
                    value={categoryFilter} 
                    onValueChange={handleNormalCategoryChange}
                    disabled={categoryFilter === "liked" || categoryFilter === "my"}
                  >
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
                </div>
              </div>

              {/* 热门标签 */}
              {popularTags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">热门标签：</span>
                  {popularTags.map(({ tag, count }) => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer hover:bg-primary/20 transition-colors",
                        selectedTag === tag && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    >
                      {tag}
                      <span className="ml-1 text-xs opacity-60">({count})</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              // 加载状态显示骨架屏
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted-foreground/20 rounded animate-pulse" />
                      <div className="h-4 bg-muted-foreground/20 rounded w-2/3 animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredModels.length > 0 ? (
              filteredModels.map((model) => (
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
                        <div className="flex gap-2">
                          {model.user_id === user?.id && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteModel(model)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/showcase/${model.id}`)}>
                            查看
                          </Button>
                        </div>
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
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">暂无模型</p>
              </div>
            )}
          </div>

          {hasMore && searchTerm.trim() === "" && (
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

        {/* 排行榜模态框 */}
        <DesignerLeaderboard
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
          designers={designers}
        />

        <UploadModelDialog
          open={uploadDialog}
          onOpenChange={setUploadDialog}
          onSuccess={() => {
            setPage(1)
            loadModels()
          }}
        />

        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                确认删除
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                您确定要删除模型 <span className="font-medium text-foreground">"{modelToDelete?.title}"</span> 吗？
              </p>
              <p className="text-sm text-destructive">此操作不可逆，删除后将无法恢复。</p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialog(false)
                    setModelToDelete(null)
                  }}
                >
                  取消
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  确认删除
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
