"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: "login" | "register"
}

export function AuthModal({ isOpen, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode)

  const handleClose = () => {
    onClose()
    // 重置为默认模式
    setTimeout(() => setMode("login"), 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-none">
        {mode === "login" ? (
          <LoginForm onSwitchToRegister={() => setMode("register")} onClose={handleClose} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode("login")} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
