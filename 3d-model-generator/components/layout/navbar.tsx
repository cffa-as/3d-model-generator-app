"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { AuthModal } from "@/components/auth/auth-modal"
import { Cable as Cube, User, LogOut, BarChart3, History, LayoutDashboard, Star } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import React from "react"

// 预加载常用路由
const PREFETCH_ROUTES = ['/', '/dashboard', '/tasks', '/admin', '/admin/evaluation']

export function Navbar() {
  const { user, logout } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // 在组件挂载时预加载路由
  React.useEffect(() => {
    PREFETCH_ROUTES.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  const handleAuthClick = (mode: "login" | "register") => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const clearUserSession = useCallback(async (redirectTo: string = "/") => {
    try {
      // 先清除用户会话
      logout()
      
      // 显示提示
      toast({
        title: "已退出登录",
        description: "期待您的下次使用",
      })

      // 强制刷新页面并跳转
      window.location.href = redirectTo
    } catch (error) {
      console.error("退出登录失败:", error)
      toast({
        title: "退出失败",
        description: "请稍后重试",
        variant: "destructive",
      })
    }
  }, [logout, toast])

  const handleLogout = async () => {
    await clearUserSession("/")
  }

  const handleSwitchAccount = async () => {
    setDropdownOpen(false)
    await clearUserSession("/auth")
  }

  const isAdmin = user?.role === "admin"

  const NavLink = ({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon: React.ComponentType<any> }) => {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        prefetch={true}
        className={cn(
          "flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors cursor-pointer",
          "hover:bg-accent/50 px-3 py-2 rounded-md",
          isActive && "text-foreground font-medium bg-accent/30"
        )}
      >
        <Icon className="h-4 w-4" />
        {children}
      </Link>
    )
  }

  return (
    <>
      <nav className="glass-strong border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
                <Cube className="h-6 w-6 text-primary" />
              <span className="font-semibold">创意3D建模</span>
            </Link>

            {/* Navigation Links */}
            {user && (
              <div className="hidden md:flex items-center gap-6">
                <NavLink href="/" icon={Cube}>首页</NavLink>
                <NavLink href="/dashboard" icon={LayoutDashboard}>工作台</NavLink>
                <NavLink href="/tasks" icon={History}>任务历史</NavLink>
                {isAdmin && (
                  <>
                    <NavLink href="/admin" icon={BarChart3}>管理面板</NavLink>
                    <NavLink href="/admin/evaluation" icon={Star}>模型评估</NavLink>
                  </>
                )}
              </div>
            )}

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* 桌面端显示退出按钮 */}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2 text-foreground/80 hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </Button>

                  {/* 用户头像下拉菜单 */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-popover rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                        <div className="p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                        <div className="border-t border-border/50" />
                        <div className="p-1">
                          <Link
                            href="/"
                            className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Cube className="mr-2 h-4 w-4" />
                            首页
                          </Link>
                          <Link
                            href="/dashboard"
                            className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            工作台
                          </Link>
                          <Link
                            href="/tasks"
                            className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            任务历史
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                href="/admin"
                                className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                                onClick={() => setDropdownOpen(false)}
                              >
                                <BarChart3 className="mr-2 h-4 w-4" />
                                管理面板
                              </Link>
                              <Link
                                href="/admin/evaluation"
                                className="flex items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                                onClick={() => setDropdownOpen(false)}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                模型评估
                              </Link>
                            </>
                          )}
                          <button
                            onClick={handleSwitchAccount}
                            className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                          >
                            <User className="mr-2 h-4 w-4" />
                            切换账号
                          </button>
                        </div>
                        <div className="border-t border-border/50" />
                        <div className="p-1 md:hidden">
                          <button
                            onClick={() => {
                              setDropdownOpen(false)
                              handleLogout()
                            }}
                            className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent rounded-sm"
                          >
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => handleAuthClick("login")}>
                    登录
                  </Button>
                  <Button onClick={() => handleAuthClick("register")}>注册</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultMode={authMode} />
    </>
  )
}
