"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface LoginFormProps {
  onSwitchToRegister: () => void
  onClose?: () => void
}

export function LoginForm({ onSwitchToRegister, onClose }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username.trim() || !password.trim()) {
      setError("请填写所有字段")
      return
    }

    try {
      await login(username, password)
      toast({
        title: "登录成功",
        description: "欢迎回来",
      })
      if (onClose) {
        onClose()
      }
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败")
    }
  }

  return (
    <Card className="glass w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-balance">登录账户</CardTitle>
        <CardDescription className="text-muted-foreground">使用您的账户登录3D模型生成平台</CardDescription>
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
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              disabled={isLoading}
              className="bg-input/50"
            />
          </div>
          {error && <div className="text-destructive text-sm text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                登录
              </>
            )}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            还没有账户？{" "}
            <button onClick={onSwitchToRegister} className="text-primary hover:underline">
              立即注册
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
