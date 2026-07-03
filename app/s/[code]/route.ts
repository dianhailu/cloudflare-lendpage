import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 解析 User-Agent 获取设备信息
function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  const uaLower = ua.toLowerCase()
  
  // 设备类型
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  
  // 浏览器
  let browser = 'unknown'
  if (uaLower.includes('chrome') && !uaLower.includes('edge')) browser = 'Chrome'
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari'
  else if (uaLower.includes('firefox')) browser = 'Firefox'
  else if (uaLower.includes('edge')) browser = 'Edge'
  else if (uaLower.includes('opera') || uaLower.includes('opr')) browser = 'Opera'
  
  // 操作系统
  let os = 'unknown'
  if (uaLower.includes('windows')) os = 'Windows'
  else if (uaLower.includes('mac os') || uaLower.includes('macos')) os = 'macOS'
  else if (uaLower.includes('android')) os = 'Android'
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS'
  else if (uaLower.includes('linux')) os = 'Linux'
  
  return { deviceType, browser, os }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = await createClient()
  
  // 查找短链接
  const { data: link, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single()
  
  if (error || !link) {
    // 链接不存在或已禁用，重定向到首页
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // 检查是否过期
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // 获取访问信息
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const referer = request.headers.get('referer') || null
  
  const { deviceType, browser, os } = parseUserAgent(userAgent)
  
  // 记录访问（异步，不阻塞重定向）
  supabase
    .from('link_visits')
    .insert({
      link_id: link.id,
      link_code: code,
      ip_address: ip,
      user_agent: userAgent,
      referer: referer,
      device_type: deviceType,
      browser: browser,
      os: os,
    })
    .then(() => {
      // 更新点击计数
      supabase
        .from('short_links')
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq('id', link.id)
    })
  
  // 构建目标 URL，添加追踪参数
  const targetUrl = new URL(link.target_url)
  targetUrl.searchParams.set('ref', code)
  if (link.channel) {
    targetUrl.searchParams.set('channel', link.channel)
  }
  
  return NextResponse.redirect(targetUrl.toString())
}
