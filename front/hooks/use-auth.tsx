"use client"

import { useState, useEffect, createContext, useContext, type ReactNode, useCallback } from "react"
import { AuthService, type User } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/api"

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查本地存储的token
    const token = AuthService.getToken()
    if (token) {
      // 解析token获取过期时间
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expTime = payload.exp * 1000 // 转换为毫秒
        const now = Date.now()
        const timeUntilExp = expTime - now

        // 如果token还有效
        if (timeUntilExp > 0) {
          // 获取用户信息
          AuthService.getCurrentUser()
            .then(setUser)
            .catch(() => {
              AuthService.logout()
              setUser(null)
            })
            .finally(() => setIsLoading(false))

          // 如果token将在24小时内过期，设置自动刷新
          if (timeUntilExp < 24 * 60 * 60 * 1000) {
            const refreshToken = async () => {
              try {
                const response = await fetch(`${API_BASE_URL}/users/refresh`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                if (response.ok) {
                  const data = await response.json()
                  AuthService.setToken(data.access_token)
                  // 更新用户信息
                  const user = await AuthService.getCurrentUser()
                  setUser(user)
                }
              } catch (error) {
                console.error('刷新token失败:', error)
              }
            }
            refreshToken()
          }
        } else {
          // token已过期
          AuthService.logout()
          setUser(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('解析token失败:', error)
        AuthService.logout()
        setUser(null)
        setIsLoading(false)
      }
    } else {
    setIsLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const user = await AuthService.login(username, password)
      setUser(user)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (username: string, password: string, email: string) => {
    setIsLoading(true)
    try {
      const user = await AuthService.register(username, password, email)
      setUser(user)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = useCallback(() => {
    setIsLoading(true)
    try {
    AuthService.logout()
    setUser(null)
    } finally {
      setIsLoading(false)
  }
  }, [])

  return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
