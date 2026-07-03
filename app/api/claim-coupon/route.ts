import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 印尼手机号运营商前缀
const VALID_PREFIXES = [
  '811', '812', '813', '821', '822', '823', '851', '852', '853', // Telkomsel
  '814', '815', '816', '855', '856', '857', '858', // Indosat
  '817', '818', '819', '859', '877', '878', // XL
  '831', '832', '833', '838', // Axis
  '895', '896', '897', '898', '899', // Three
  '881', '882', '883', '884', '885', '886', '887', '888', '889', // Smartfren
]

// 验证印尼手机号格式
function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  
  // 标准化为 8xxx 格式
  let normalized = cleaned
  if (cleaned.startsWith('0')) {
    normalized = cleaned.substring(1)
  }
  
  // 检查长度：8xxx 格式应该是 9-12 位数字
  if (normalized.length < 9 || normalized.length > 12) {
    return false
  }
  
  // 必须以 8 开头
  if (!normalized.startsWith('8')) {
    return false
  }
  
  // 检查运营商前缀（前三位）
  const prefix = normalized.substring(0, 3)
  if (!VALID_PREFIXES.includes(prefix)) {
    return false
  }
  
  return true
}

// 标准化手机号为 +62 格式
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('62')) {
    return '+' + cleaned
  }
  if (cleaned.startsWith('0')) {
    return '+62' + cleaned.substring(1)
  }
  return '+62' + cleaned
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, refCode, channel, sourceUrl } = body

    // 验证手机号
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Nomor telepon diperlukan' },
        { status: 400 }
      )
    }

    if (!isValidIndonesianPhone(phoneNumber)) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak valid' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    const supabase = await createClient()

    // 获取请求信息
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                      request.headers.get('x-real-ip') || ''

    // 检查手机号是否已经领取过
    const { data: existingClaim } = await supabase
      .from('coupon_claims')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single()

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Nomor ini sudah pernah mengklaim kupon', alreadyClaimed: true },
        { status: 400 }
      )
    }

    // 插入新的领取记录
    const { error: insertError } = await supabase
      .from('coupon_claims')
      .insert({
        phone_number: normalizedPhone,
        ref_code: refCode || null,
        channel: channel || null,
        source_url: sourceUrl || null,
        user_agent: userAgent,
        ip_address: ipAddress,
      })

    if (insertError) {
      console.error('Failed to insert coupon claim:', insertError)
      return NextResponse.json(
        { error: 'Gagal mengklaim kupon' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Kupon berhasil diklaim!'
    })

  } catch (error) {
    console.error('Claim coupon error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
