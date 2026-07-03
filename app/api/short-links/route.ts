import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 生成随机短链接码
function generateCode(length: number = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789' // 排除容易混淆的字符
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 简单的管理密钥验证（生产环境应使用更安全的方式）
function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key')
  const expectedKey = process.env.ADMIN_API_KEY || 'pingo-admin-2026'
  return adminKey === expectedKey
}

// 获取短链接列表
export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const channel = searchParams.get('channel')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  
  let query = supabase
    .from('short_links')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (channel) {
    query = query.eq('channel', channel)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({
    links: data,
    total: count,
    limit,
    offset
  })
}

// 创建新短链接
export async function POST(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { name, channel, targetUrl, customCode, expiresAt, metadata } = body
    
    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // 如果提供了自定义码，检查是否已存在
    let code = customCode
    if (code) {
      const { data: existing } = await supabase
        .from('short_links')
        .select('id')
        .eq('code', code)
        .single()
      
      if (existing) {
        return NextResponse.json({ error: 'Code already exists' }, { status: 400 })
      }
    } else {
      // 生成唯一码
      let attempts = 0
      while (attempts < 10) {
        code = generateCode()
        const { data: existing } = await supabase
          .from('short_links')
          .select('id')
          .eq('code', code)
          .single()
        
        if (!existing) break
        attempts++
      }
      
      if (attempts >= 10) {
        return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 })
      }
    }
    
    // 创建短链接
    const { data, error } = await supabase
      .from('short_links')
      .insert({
        code,
        name: name || null,
        channel: channel || 'sms',
        target_url: targetUrl,
        expires_at: expiresAt || null,
        metadata: metadata || null
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 返回短链接信息
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || ''
    
    return NextResponse.json({
      success: true,
      link: data,
      shortUrl: `${baseUrl}/s/${code}`,
      code
    })
    
  } catch (error) {
    console.error('Create short link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 批量创建短链接
export async function PUT(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { count, channel, targetUrl, namePrefix, expiresAt } = body
    
    if (!targetUrl || !count || count < 1 || count > 100) {
      return NextResponse.json({ 
        error: 'Invalid request. Provide targetUrl and count (1-100)' 
      }, { status: 400 })
    }
    
    const supabase = await createClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || ''
    
    const links = []
    const usedCodes = new Set<string>()
    
    for (let i = 0; i < count; i++) {
      // 生成唯一码
      let code = generateCode()
      let attempts = 0
      while (usedCodes.has(code) && attempts < 10) {
        code = generateCode()
        attempts++
      }
      usedCodes.add(code)
      
      links.push({
        code,
        name: namePrefix ? `${namePrefix}-${i + 1}` : `Link ${i + 1}`,
        channel: channel || 'sms',
        target_url: targetUrl,
        expires_at: expiresAt || null,
      })
    }
    
    // 批量插入
    const { data, error } = await supabase
      .from('short_links')
      .insert(links)
      .select()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 返回短链接列表
    const result = data.map(link => ({
      ...link,
      shortUrl: `${baseUrl}/s/${link.code}`
    }))
    
    return NextResponse.json({
      success: true,
      count: result.length,
      links: result
    })
    
  } catch (error) {
    console.error('Batch create short links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
