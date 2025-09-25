"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { AuthModal } from "@/components/auth/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { AuthProvider } from "@/hooks/use-auth"
import { Cable as Cube, Sparkles, ImageIcon, Type, Images, Download, ArrowRight, Play } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

function HomePage() {
  const { user } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("register")
  const router = useRouter()

  const features = [
    {
      icon: Type,
      title: "文本生成3D",
      description: "输入文字描述，AI自动生成精美3D模型",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      icon: ImageIcon,
      title: "图片转3D",
      description: "上传图片，智能识别并转换为3D模型",
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      icon: Images,
      title: "多图生成",
      description: "使用多张图片生成更精确的3D模型",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
    {
      icon: Download,
      title: "多格式导出",
      description: "支持GLB、OBJ、FBX、USDZ等格式",
      color: "text-orange-400",
      bgColor: "bg-orange-400/10",
    },
  ]

  const stats = [
    { label: "已生成模型", value: "10,000+" },
    { label: "注册用户", value: "5,000+" },
    { label: "成功率", value: "99%" },
    { label: "平均用时", value: "2分钟" },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            {/* 主标题 */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-primary/20 animate-glow">
                  <Cube className="h-16 w-16 text-primary animate-float" />
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-balance">
                AI驱动的
                <span className="text-primary block">3D模型生成</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty">
                使用先进的AI技术，从文本和图片快速生成高质量3D模型，支持多种格式导出
              </p>
            </div>

            {/* CTA按钮 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <>
                  <Button asChild size="lg" className="text-lg px-8 py-6">
                    <Link href="/dashboard">
                      立即开始
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 glass bg-transparent"
                    onClick={() => {
                      setAuthMode("login")
                      setAuthModalOpen(true)
                    }}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    观看演示
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6"
                    onClick={() => {
                      setAuthMode("register")
                      setAuthModalOpen(true)
                    }}
                  >
                    立即开始
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6 glass bg-transparent"
                    onClick={() => {
                      setAuthMode("login")
                      setAuthModalOpen(true)
                    }}
                  >
                    <Play className="mr-2 h-5 w-5" />
                    观看演示
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 装饰性背景 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
      </section>

      {/* 统计数据 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="glass text-center">
                <CardContent className="p-6">
                  <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-balance">强大的AI生成能力</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              多种输入方式，一键生成专业级3D模型
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass hover:glass-strong transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div
                    className={`inline-flex p-4 rounded-2xl ${feature.bgColor} mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-pretty">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 精品模型展示 */}
      <section className="py-10 bg-black/5 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-6">精品模型展示</h2>
          <div className="grid grid-cols-1 gap-6">
            {/* 蝙蝠侠模型 */}
            <div className="group relative overflow-hidden rounded-xl bg-black/20 p-5 backdrop-blur-sm hover:bg-black/30 transition">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="md:w-[45%] overflow-hidden rounded-lg bg-black/10">
                  <img 
                    src="/showcase/batman.jpg" 
                    alt="蝙蝠侠角色模型"
                    className="w-full h-[320px] object-contain"
                  />
                </div>
                <div className="md:w-[55%] space-y-3 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold">蝙蝠侠角色模型</h3>
                  <p className="text-muted-foreground">高品质游戏角色模型，完美展现蝙蝠侠的威严形象。优化的拓扑结构，适合游戏引擎实时渲染。</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-sm">游戏角色</Badge>
                    <Badge variant="outline" className="text-sm">高精度</Badge>
                    <Badge variant="outline" className="text-sm">PBR材质</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 猫娘模型 */}
            <div className="group relative overflow-hidden rounded-xl bg-black/20 p-5 backdrop-blur-sm hover:bg-black/30 transition">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="md:w-[45%] overflow-hidden rounded-lg bg-black/10">
                  <img 
                    src="/showcase/catgirl.jpg" 
                    alt="可爱猫娘模型"
                    className="w-full h-[320px] object-contain"
                  />
                </div>
                <div className="md:w-[55%] space-y-3 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold">可爱猫娘模型</h3>
                  <p className="text-muted-foreground">二次元风格角色模型，细腻的服装褶皱和毛发效果。适合动画和游戏使用，支持全身骨骼动画。</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-sm">动画角色</Badge>
                    <Badge variant="outline" className="text-sm">二次元风格</Badge>
                    <Badge variant="outline" className="text-sm">骨骼动画</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 防化服角色 */}
            <div className="group relative overflow-hidden rounded-xl bg-black/20 p-5 backdrop-blur-sm hover:bg-black/30 transition">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="md:w-[45%] overflow-hidden rounded-lg bg-black/10">
                  <img 
                    src="/showcase/hazmat.jpg" 
                    alt="防化服角色模型"
                    className="w-full h-[320px] object-contain"
                  />
                </div>
                <div className="md:w-[55%] space-y-3 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold">防化服角色模型</h3>
                  <p className="text-muted-foreground">写实风格的防化服角色，丰富的装备细节和材质表现。适合科幻、生化类游戏场景。</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-sm">写实角色</Badge>
                    <Badge variant="outline" className="text-sm">高细节</Badge>
                    <Badge variant="outline" className="text-sm">次世代材质</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 text-lg px-8 py-6"
              onClick={() => {
                if (user) {
                  router.push('/dashboard');
                } else {
                  setAuthMode("register");
                  setAuthModalOpen(true);
                }
              }}
            >
              开始创建您的3D模型
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="glass-strong">
            <CardContent className="p-12">
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-balance">准备开始创建您的3D模型了吗？</h2>
                <p className="text-xl text-muted-foreground text-pretty">
                  加入数千名创作者，使用AI技术快速生成专业级3D模型
                </p>
                {user ? (
                  <Button asChild size="lg" className="text-lg px-8 py-6">
                    <Link href="/dashboard">
                      前往工作台
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6"
                    onClick={() => {
                      setAuthMode("register")
                      setAuthModalOpen(true)
                    }}
                  >
                    立即开始
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
    </div>
  )
}

export default function Page() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
