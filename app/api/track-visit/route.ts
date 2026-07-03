import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { visitorId, sourceUrl, refCode, channel } = body

    if (!visitorId || !sourceUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 获取请求信息
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                      request.headers.get('x-real-ip') || ''

    // 插入访问记录
    const { error: insertError } = await supabase
      .from('page_visits')
      .insert({
        visitor_id: visitorId,
        source_url: sourceUrl,
        ref_code: refCode || null,
        channel: channel || null,
        user_agent: userAgent,
        ip_address: ipAddress,
      })

    if (insertError) {
      console.error('Failed to track visit:', insertError)
      return NextResponse.json(
        { error: 'Failed to track visit' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Track visit error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
