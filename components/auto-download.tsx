"use client"

import { useEffect, useRef } from "react"

interface AutoDownloadProps {
  apkUrl: string
}

export function AutoDownload({ apkUrl }: AutoDownloadProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(function triggerDownload() {
    if (!apkUrl) return
    
    // 方法1: 使用隐藏iframe触发下载（最兼容）
    var iframe = iframeRef.current
    if (iframe) {
      iframe.src = apkUrl
    }
  }, [apkUrl])

  // 渲染一个隐藏的iframe用于触发下载
  return (
    <iframe
      ref={iframeRef}
      style={{
        display: "none",
        width: 0,
        height: 0,
        border: "none",
        position: "absolute",
        left: "-9999px"
      }}
      title="download"
    />
  )
}
