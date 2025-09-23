"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface RegisterFormProps {
  onSwitchToLogin: () => void
  onClose?: () => void
}

export function RegisterForm({ onSwitchToLogin, onClose }: RegisterFormProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const { register, isLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("请填写所有字段")
      return
    }

    if (password !== confirmPassword) {
      setError("密码确认不匹配")
      return
    }

    if (password.length < 6) {
      setError("密码长度至少6位")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址")
      return
    }

    try {
      await register(username, password, email)
      toast({
        title: "注册成功",
        description: "欢迎使用3D模型生成服务",
      })
      if (onClose) {
        onClose()
      }
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败")
    }
  }

  return (
    <Card className="glass w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-balance">创建账户</CardTitle>
        <CardDescription className="text-muted-foreground">注册新账户开始创建3D模型</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              disabled={isLoading}
              className="bg-input/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入邮箱地址"
              disabled={isLoading}
              className="bg-input/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码（至少6位）"
              disabled={isLoading}
              className="bg-input/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              disabled={isLoading}
              className="bg-input/50"
            />
          </div>
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                注册
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            已有账户？{" "}
            <button onClick={onSwitchToLogin} className="text-primary hover:underline">
              立即登录
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
