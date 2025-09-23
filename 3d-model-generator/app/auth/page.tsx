"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/hooks/use-auth"
import { Cable as Cube, Sparkles } from "lucide-react"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user) {
    return null // 避免闪烁
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* 左侧：品牌展示 */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 animate-glow">
                <Cube className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-balance">创意3D模型生成</h1>
            </div>
            <p className="text-xl text-muted-foreground text-pretty">使用AI技术从文本和图片生成高质量3D模型</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">文本生成3D模型</h3>
                <p className="text-muted-foreground">只需输入描述文字，AI即可为您生成精美的3D模型</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">图片转3D模型</h3>
                <p className="text-muted-foreground">上传图片，自动识别并生成对应的3D模型</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">多格式导出</h3>
                <p className="text-muted-foreground">支持GLB、OBJ、FBX、USDZ等多种3D格式导出</p>
              </div>
            </div>
          </div>

          {/* 装饰性3D元素 */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur-3xl animate-pulse" />
            <div className="relative glass p-6 rounded-2xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
                <div className="text-muted-foreground">已生成3D模型</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：认证表单 */}
        <div className="flex justify-center">
          {mode === "login" ? (
            <LoginForm onSwitchToRegister={() => setMode("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  )
}
