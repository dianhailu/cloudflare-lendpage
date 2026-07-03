"use client"

import { useEffect } from "react"

interface VisitTrackerProps {
  refCode?: string | null
  channel?: string | null
}

export function VisitTracker({ refCode, channel }: VisitTrackerProps) {
  useEffect(() => {
    // 所有动态逻辑都在 useEffect 内部执行，避免 hydration 不匹配
    const getVisitorId = (): string => {
      const storageKey = 'pingo_visitor_id'
      let visitorId = localStorage.getItem(storageKey)
      
      if (!visitorId) {
        visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
        localStorage.setItem(storageKey, visitorId)
      }
      
      return visitorId
    }

    const trackVisit = async () => {
      try {
        const visitorId = getVisitorId()
        const sourceUrl = window.location.href
        
        await fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            sourceUrl,
            refCode,
            channel,
          }),
        })
      } catch {
        // 静默失败，不影响用户体验
      }
    }

    trackVisit()
  }, [refCode, channel])

  // 这个组件不渲染任何内容
  return null
}
