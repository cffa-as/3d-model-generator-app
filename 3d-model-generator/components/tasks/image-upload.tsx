"use client"

import { useState, useRef, useEffect } from "react"
import type { ChangeEvent, DragEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  onUpload: (files: File[]) => void
  onRemove?: () => void
  accept?: string
  className?: string
  multiple?: boolean
  maxFiles?: number
}

export function ImageUpload({
  onUpload,
  onRemove,
  accept = "image/jpeg,image/png",
  className,
  multiple = false,
  maxFiles = 1,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024, // 10MB limit
    )

    if (validFiles.length === 0) return

    const filesToProcess = multiple ? validFiles.slice(0, maxFiles - uploadedFiles.length) : [validFiles[0]]

    // 创建预览URL
    const newPreviewUrls = filesToProcess.map((file) => URL.createObjectURL(file))
    
    if (multiple) {
      setUploadedFiles((prev: File[]) => [...prev, ...filesToProcess])
      setPreviewUrls((prev: string[]) => [...prev, ...newPreviewUrls])
    } else {
      // 清理之前的预览URL
      previewUrls.forEach(URL.revokeObjectURL)
      setUploadedFiles([filesToProcess[0]])
      setPreviewUrls([newPreviewUrls[0]])
    }
    
    onUpload(filesToProcess)
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setUploadedFiles((prev: File[]) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev: string[]) => prev.filter((_, i) => i !== index))
    if (onRemove) onRemove()
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  // 组件卸载时清理预览URL
  useEffect(() => {
    return () => {
      previewUrls.forEach(URL.revokeObjectURL)
    }
  }, [previewUrls])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card
        className={cn(
          "glass border-2 border-dashed transition-all duration-200 cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50",
          uploadedFiles.length > 0 && !multiple ? "opacity-50" : "",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium mb-2">{multiple ? "上传图片" : "上传图片"}</p>
              <p className="text-sm text-muted-foreground">拖拽图片到此处或点击选择文件</p>
              <p className="text-xs text-muted-foreground mt-2">
                支持 JPG、PNG 格式，最大 10MB
                {multiple && ` (最多${maxFiles}张)`}
              </p>
            </div>
            <Button variant="outline" type="button">
              选择文件
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Images Preview */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previewUrls.map((url, index) => (
            <Card key={index} className="glass relative group">
              <CardContent className="p-2">
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={url || "/placeholder.svg"}
                    alt={`上传的图片 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        multiple={multiple}
        className="hidden"
      />
    </div>
  )
}
