"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronRight } from "lucide-react"

interface SliderCaptchaProps {
  onVerified: (token: string) => void
  onReset?: () => void
}

// 生成验证 token
function generateCaptchaToken(timestamp: number, slideTime: number, accuracy: number): string {
  const secret = 'pingo-captcha-2026'
  const data = `${timestamp}:${slideTime}:${accuracy}:${secret}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `${Math.abs(hash).toString(36)}_${timestamp}_${slideTime}_${Math.round(accuracy)}`
}

export function SliderCaptcha({ onVerified, onReset }: SliderCaptchaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  const sliderWidth = 44
  
  // 检查是否滑到了底部（95% 位置）
  const checkIfAtEnd = (pos: number, containerWidth: number): boolean => {
    const maxPosition = containerWidth - sliderWidth
    return pos >= maxPosition * 0.95
  }
  
  const handleStart = useCallback((clientX: number) => {
    if (isVerified) return
    setIsDragging(true)
  }, [isVerified])
  
  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current || isVerified) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const maxPosition = containerRef.current.offsetWidth - sliderWidth
    let newPosition = clientX - rect.left - sliderWidth / 2
    
    newPosition = Math.max(0, Math.min(newPosition, maxPosition))
    setPosition(newPosition)
    
    // 检查是否滑到了底部
    if (checkIfAtEnd(newPosition, containerRef.current.offsetWidth)) {
      completeVerification()
    }
  }, [isDragging, isVerified])
  
  const completeVerification = useCallback(() => {
    setIsDragging(false)
    setIsVerified(true)
    const token = generateCaptchaToken(Date.now(), 0, 100)
    onVerified(token)
  }, [onVerified])
  
  const handleEnd = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX)
  }, [handleMove])
  
  const handleMouseUp = useCallback(() => {
    handleEnd()
  }, [handleEnd])
  
  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    handleEnd()
  }
  
  // 绑定全局事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {isVerified ? 'Verifikasi berhasil' : 'Geser slider ke kanan hingga akhir'}
        </span>
      </div>
      
      <div
        ref={containerRef}
        className={cn(
          "relative h-11 rounded-lg border-2 transition-colors overflow-hidden",
          isVerified ? "bg-green-50 border-green-500" :
          isDragging ? "border-primary" : "border-border bg-muted/30"
        )}
      >
        {/* 已滑动区域 */}
        <div
          className={cn(
            "absolute top-0 bottom-0 left-0 transition-colors",
            isVerified ? "bg-green-500/20" : "bg-primary/10"
          )}
          style={{ width: position + sliderWidth / 2 }}
        />
        
        {/* 滑块 */}
        <div
          ref={sliderRef}
          className={cn(
            "absolute top-0 bottom-0 w-11 flex items-center justify-center cursor-grab transition-colors rounded-md m-0.5",
            isVerified ? "bg-green-500 cursor-default" :
            isDragging ? "bg-primary cursor-grabbing" : "bg-primary/80 hover:bg-primary"
          )}
          style={{ 
            left: position,
            touchAction: 'none'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isVerified ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
    </div>
  )
}
