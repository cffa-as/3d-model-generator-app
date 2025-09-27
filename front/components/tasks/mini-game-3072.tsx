"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, Trophy, GamepadIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface GameState {
  grid: number[][]
  score: number
  isGameOver: boolean
  hasWon: boolean
}

interface MiniGame3072Props {
  open: boolean
  onClose: () => void
}

export function MiniGame3072({ open, onClose }: MiniGame3072Props) {
  const [gameState, setGameState] = useState<GameState>({
    grid: initializeGrid(),
    score: 0,
    isGameOver: false,
    hasWon: false
  })
  const [highScore, setHighScore] = useState<number>(0)
  const [showKeyHint, setShowKeyHint] = useState(true)

  // 初始化4x4网格
  function initializeGrid(): number[][] {
    const grid = Array(4).fill(null).map(() => Array(4).fill(0))
    addRandomTile(grid)
    addRandomTile(grid)
    return grid
  }

  // 添加随机数字块（3或6）
  function addRandomTile(grid: number[][]) {
    const emptyCells = []
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 0) {
          emptyCells.push({ row, col })
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
      grid[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 3 : 6
    }
  }

  // 移动和合并逻辑
  function moveLeft(grid: number[][]): { newGrid: number[][], scoreGain: number, moved: boolean } {
    const newGrid = grid.map(row => [...row])
    let scoreGain = 0
    let moved = false

    for (let row = 0; row < 4; row++) {
      const rowArray = newGrid[row].filter(val => val !== 0)
      
      // 合并相同数字
      for (let i = 0; i < rowArray.length - 1; i++) {
        if (rowArray[i] === rowArray[i + 1]) {
          rowArray[i] *= 2
          scoreGain += rowArray[i]
          rowArray.splice(i + 1, 1)
        }
      }
      
      // 填充0
      while (rowArray.length < 4) {
        rowArray.push(0)
      }
      
      // 检查是否有移动
      for (let i = 0; i < 4; i++) {
        if (newGrid[row][i] !== rowArray[i]) {
          moved = true
        }
        newGrid[row][i] = rowArray[i]
      }
    }

    return { newGrid, scoreGain, moved }
  }

  function moveRight(grid: number[][]): { newGrid: number[][], scoreGain: number, moved: boolean } {
    const reversed = grid.map(row => [...row].reverse())
    const result = moveLeft(reversed)
    result.newGrid = result.newGrid.map(row => row.reverse())
    return result
  }

  function moveUp(grid: number[][]): { newGrid: number[][], scoreGain: number, moved: boolean } {
    const transposed = transpose(grid)
    const result = moveLeft(transposed)
    result.newGrid = transpose(result.newGrid)
    return result
  }

  function moveDown(grid: number[][]): { newGrid: number[][], scoreGain: number, moved: boolean } {
    const transposed = transpose(grid)
    const result = moveRight(transposed)
    result.newGrid = transpose(result.newGrid)
    return result
  }

  function transpose(grid: number[][]): number[][] {
    return grid[0].map((_, colIndex) => grid.map(row => row[colIndex]))
  }

  // 检查游戏是否结束
  function isGameOver(grid: number[][]): boolean {
    // 检查是否有空格
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 0) return false
      }
    }

    // 检查是否可以合并
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const current = grid[row][col]
        if (
          (row < 3 && grid[row + 1][col] === current) ||
          (col < 3 && grid[row][col + 1] === current)
        ) {
          return false
        }
      }
    }

    return true
  }

  // 检查是否获胜（达到3072）
  function hasWon(grid: number[][]): boolean {
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (grid[row][col] === 3072) return true
      }
    }
    return false
  }

  // 处理按键
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.isGameOver) return

    let moveFunction: typeof moveLeft
    switch (event.key) {
      case 'ArrowLeft':
        moveFunction = moveLeft
        break
      case 'ArrowRight':
        moveFunction = moveRight
        break
      case 'ArrowUp':
        moveFunction = moveUp
        break
      case 'ArrowDown':
        moveFunction = moveDown
        break
      default:
        return
    }

    event.preventDefault()
    
    // 用户首次按键后隐藏提示
    if (showKeyHint) {
      setShowKeyHint(false)
    }
    
    const { newGrid, scoreGain, moved } = moveFunction(gameState.grid)
    
    if (moved) {
      addRandomTile(newGrid)
      const newScore = gameState.score + scoreGain
      const newIsGameOver = isGameOver(newGrid)
      const newHasWon = hasWon(newGrid)

      setGameState({
        grid: newGrid,
        score: newScore,
        isGameOver: newIsGameOver,
        hasWon: newHasWon
      })

      if (newScore > highScore) {
        setHighScore(newScore)
        localStorage.setItem('3072-highscore', newScore.toString())
      }
    }
  }, [gameState, highScore, showKeyHint])

  // 重新开始游戏
  const resetGame = () => {
    setGameState({
      grid: initializeGrid(),
      score: 0,
      isGameOver: false,
      hasWon: false
    })
    setShowKeyHint(true) // 重新显示按键提示
  }

  // 获取数字块的颜色
  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      0: "bg-gray-200 text-gray-400",
      3: "bg-blue-500 text-white",
      6: "bg-blue-600 text-white",
      12: "bg-purple-500 text-white",
      24: "bg-purple-600 text-white",
      48: "bg-pink-500 text-white",
      96: "bg-pink-600 text-white",
      192: "bg-red-500 text-white",
      384: "bg-red-600 text-white",
      768: "bg-orange-500 text-white",
      1536: "bg-orange-600 text-white",
      3072: "bg-yellow-500 text-black font-bold animate-pulse shadow-lg"
    }
    return colors[value] || "bg-gray-300 text-gray-600"
  }

  useEffect(() => {
    // 从localStorage加载最高分
    const savedHighScore = localStorage.getItem('3072-highscore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore))
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

    return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GamepadIcon className="h-5 w-5 text-blue-600" />
              3072 小游戏
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 分数显示 */}
          <div className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-700">分数:</span>
              <span className="text-blue-600 font-bold">{gameState.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-gray-700">最高:</span>
              <span className="text-yellow-600 font-bold">{highScore}</span>
            </div>
          </div>

          {/* 按键提示 */}
          {showKeyHint && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-yellow-800">
                <span className="text-lg">⌨️</span>
                <div className="flex gap-1">
                  <span className="bg-yellow-200 px-1 py-0.5 rounded text-xs font-bold">↑</span>
                  <span className="bg-yellow-200 px-1 py-0.5 rounded text-xs font-bold">↓</span>
                  <span className="bg-yellow-200 px-1 py-0.5 rounded text-xs font-bold">←</span>
                  <span className="bg-yellow-200 px-1 py-0.5 rounded text-xs font-bold">→</span>
                </div>
              </div>
            </div>
          )}

          {/* 游戏网格 */}
          <div className="bg-gray-300 p-3 rounded-lg relative">

            <div className="grid grid-cols-4 gap-2">
              {gameState.grid.flat().map((value, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-16 h-16 rounded-md flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-sm",
                    getTileColor(value)
                  )}
                >
                  {value !== 0 && value}
                </div>
              ))}
            </div>
          </div>

          {/* 游戏状态提示 */}
          {gameState.hasWon && (
            <div className="text-center p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <p className="text-yellow-800 font-bold">🎉 恭喜！你达到了3072！</p>
            </div>
          )}

          {gameState.isGameOver && (
            <div className="text-center p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 font-bold">游戏结束！</p>
            </div>
          )}

          {/* 控制按钮和说明 */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={resetGame} className="flex-1" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                重新开始
              </Button>
              <Button onClick={onClose} className="flex-1" variant="secondary">
                <X className="h-4 w-4 mr-2" />
                关闭游戏
              </Button>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-blue-700 font-medium text-sm mb-2 text-center">✨ 等待任务完成时的小娱乐</p>
              
              {/* 操作提示 */}
              <div className="bg-white p-2 rounded border border-blue-300 mb-2">
                <p className="text-gray-800 font-medium text-sm mb-2 text-center">🎮 操作方式</p>
                <div className="flex justify-center items-center gap-2">
                  <div className="grid grid-cols-3 gap-1">
                    <div></div>
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold border border-gray-300">↑</div>
                    <div></div>
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold border border-gray-300">←</div>
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold border border-gray-300">↓</div>
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold border border-gray-300">→</div>
                  </div>
                  <div className="text-gray-700 text-xs ml-2">
                    <p className="font-medium">使用方向键</p>
                    <p>移动数字块</p>
                  </div>
                </div>
              </div>
              
              {/* 游戏规则 */}
              <div className="text-xs text-gray-600 text-center space-y-1">
                <p className="font-medium text-gray-700">🎯 游戏规则</p>
                <p>• 相同数字碰撞后合并翻倍</p>
                <p>• 目标是创造出 <span className="font-bold text-yellow-600">3072</span> 数字块</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 