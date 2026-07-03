import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const refCode = searchParams.get('refCode')
    const channel = searchParams.get('channel')

    const supabase = await createClient()

    // 构建查询 - 每日统计
    let dailyQuery = supabase
      .from('daily_visit_stats')
      .select('*')
      .order('visit_date', { ascending: false })

    if (startDate) {
      dailyQuery = dailyQuery.gte('visit_date', startDate)
    }
    if (endDate) {
      dailyQuery = dailyQuery.lte('visit_date', endDate)
    }
    if (refCode) {
      dailyQuery = dailyQuery.eq('ref_code', refCode)
    }
    if (channel) {
      dailyQuery = dailyQuery.eq('channel', channel)
    }

    const { data: dailyStats, error: dailyError } = await dailyQuery

    if (dailyError) {
      console.error('Failed to fetch daily stats:', dailyError)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    // 获取总体统计
    let overallQuery = supabase
      .from('overall_stats')
      .select('*')

    if (refCode) {
      overallQuery = overallQuery.eq('ref_code', refCode)
    }
    if (channel) {
      overallQuery = overallQuery.eq('channel', channel)
    }

    const { data: overallStats, error: overallError } = await overallQuery

    if (overallError) {
      console.error('Failed to fetch overall stats:', overallError)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    // 获取优惠券领取统计
    let claimsQuery = supabase
      .from('coupon_claims')
      .select('id, created_at, ref_code, channel')

    if (startDate) {
      claimsQuery = claimsQuery.gte('created_at', `${startDate}T00:00:00`)
    }
    if (endDate) {
      claimsQuery = claimsQuery.lte('created_at', `${endDate}T23:59:59`)
    }
    if (refCode) {
      claimsQuery = claimsQuery.eq('ref_code', refCode)
    }
    if (channel) {
      claimsQuery = claimsQuery.eq('channel', channel)
    }

    const { data: claims, error: claimsError } = await claimsQuery

    if (claimsError) {
      console.error('Failed to fetch claims:', claimsError)
    }

    // 计算领取转化率
    const totalClaims = claims?.length || 0
    const totalUV = overallStats?.reduce((sum, stat) => sum + (stat.total_uv || 0), 0) || 0
    const conversionRate = totalUV > 0 ? ((totalClaims / totalUV) * 100).toFixed(2) : '0'

    return NextResponse.json({
      dailyStats,
      overallStats,
      summary: {
        totalClaims,
        totalUV,
        totalPV: overallStats?.reduce((sum, stat) => sum + (stat.total_pv || 0), 0) || 0,
        conversionRate: `${conversionRate}%`
      }
    })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
