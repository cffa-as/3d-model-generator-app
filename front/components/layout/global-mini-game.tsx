"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GamepadIcon } from "lucide-react"
import { MiniGame3072 } from "@/components/tasks/mini-game-3072"
import { cn } from "@/lib/utils"

export function GlobalMiniGame() {
  const [isGameOpen, setIsGameOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsGameOpen(true)}
        className={cn(
          "h-10 w-10 p-0 rounded-full transition-all duration-200",
          "hover:bg-blue-100 hover:text-blue-600",
          "group relative"
        )}
        title="打开3072小游戏"
      >
        <GamepadIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
        
        {/* 悬浮提示 */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            3072小游戏
          </div>
        </div>
      </Button>

      <MiniGame3072 
        open={isGameOpen} 
        onClose={() => setIsGameOpen(false)} 
      />
    </>
  )
} 