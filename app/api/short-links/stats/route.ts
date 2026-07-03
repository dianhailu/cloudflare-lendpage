import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 简单的管理密钥验证
function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key')
  const expectedKey = process.env.ADMIN_API_KEY || 'pingo-admin-2026'
  return adminKey === expectedKey
}

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const code = searchParams.get('code')
  const days = parseInt(searchParams.get('days') || '7', 10)
  
  // 计算日期范围
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  if (code) {
    // 获取单个链接的详细统计
    const { data: link } = await supabase
      .from('short_links')
      .select('*')
      .eq('code', code)
      .single()
    
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    
    // 获取访问记录
    const { data: visits } = await supabase
      .from('link_visits')
      .select('*')
      .eq('link_code', code)
      .gte('visited_at', startDate.toISOString())
      .order('visited_at', { ascending: false })
    
    // 按天统计
    const dailyStats: Record<string, number> = {}
    const deviceStats: Record<string, number> = {}
    const browserStats: Record<string, number> = {}
    const osStats: Record<string, number> = {}
    
    visits?.forEach(visit => {
      // 日期统计
      const day = visit.visited_at.split('T')[0]
      dailyStats[day] = (dailyStats[day] || 0) + 1
      
      // 设备统计
      deviceStats[visit.device_type || 'unknown'] = (deviceStats[visit.device_type || 'unknown'] || 0) + 1
      
      // 浏览器统计
      browserStats[visit.browser || 'unknown'] = (browserStats[visit.browser || 'unknown'] || 0) + 1
      
      // 系统统计
      osStats[visit.os || 'unknown'] = (osStats[visit.os || 'unknown'] || 0) + 1
    })
    
    return NextResponse.json({
      link,
      totalClicks: visits?.length || 0,
      dailyStats,
      deviceStats,
      browserStats,
      osStats,
      recentVisits: visits?.slice(0, 20)
    })
  }
  
  // 获取总体统计
  const { data: links } = await supabase
    .from('short_links')
    .select('id, code, name, channel, click_count, created_at')
    .order('click_count', { ascending: false })
    .limit(20)
  
  // 按渠道统计
  const { data: channelStats } = await supabase
    .from('short_links')
    .select('channel')
  
  const channelCounts: Record<string, number> = {}
  channelStats?.forEach(item => {
    channelCounts[item.channel || 'unknown'] = (channelCounts[item.channel || 'unknown'] || 0) + 1
  })
  
  // 总点击数
  const totalClicks = links?.reduce((sum, link) => sum + (link.click_count || 0), 0) || 0
  
  // 今日访问
  const today = new Date().toISOString().split('T')[0]
  const { count: todayVisits } = await supabase
    .from('link_visits')
    .select('*', { count: 'exact', head: true })
    .gte('visited_at', `${today}T00:00:00`)
  
  return NextResponse.json({
    totalLinks: links?.length || 0,
    totalClicks,
    todayVisits: todayVisits || 0,
    channelStats: channelCounts,
    topLinks: links
  })
}
