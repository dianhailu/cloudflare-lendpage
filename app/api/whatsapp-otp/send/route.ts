import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// nxcloud API 配置 - 密钥必须通过环境变量配置
const NXCLOUD_API_URL = 'http://api2.nxcloud.com/api/sms/mtsend'
const NXCLOUD_APPKEY = process.env.NXCLOUD_APPKEY || ''
const NXCLOUD_SECRETKEY = process.env.NXCLOUD_SECRETKEY || ''

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Validate Indonesian phone number (starts with 8 or 08, 9-13 digits total)
function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return /^0?8\d{8,11}$/.test(cleaned)
}

// Normalize phone number to standard format (8xxx without leading 0)
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('08')) {
    return cleaned.substring(1)
  }
  return cleaned
}

// Send OTP via nxcloud SMS/WhatsApp API
async function sendOTPViaNxcloud(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 检查环境变量是否配置
    if (!NXCLOUD_APPKEY || !NXCLOUD_SECRETKEY) {
      console.error('[nxcloud] Missing NXCLOUD_APPKEY or NXCLOUD_SECRETKEY')
      return {
        success: false,
        error: 'SMS service not configured'
      }
    }
    
    // nxcloud 要求手机号格式: 国码+手机号，如 628xxxxxxxxxx
    const fullPhone = `62${phone}`
    
    // OTP 短信内容
    const content = `[PinGo] Kode verifikasi Anda adalah: ${otp}. Berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.`
    
    // 构建请求参数
    const params = new URLSearchParams({
      appkey: NXCLOUD_APPKEY,
      secretkey: NXCLOUD_SECRETKEY,
      phone: fullPhone,
      content: content
    })

    console.log(`[nxcloud] Sending OTP to ${fullPhone}`)

    const response = await fetch(NXCLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const result = await response.json()
    
    console.log(`[nxcloud] Response:`, result)

    // nxcloud 返回 code: "0" 表示成功
    if (result.code === '0' || result.code === 0) {
      return {
        success: true,
        messageId: result.messageid
      }
    } else {
      // 处理错误码
      const errorMessages: Record<string, string> = {
        '1': 'Aplikasi tidak tersedia atau kunci salah',
        '2': 'Parameter error',
        '3': 'Saldo tidak mencukupi',
        '4': 'Konten kosong atau mengandung kata terlarang',
        '5': 'Konten terlalu panjang',
        '6': 'Nomor tidak valid',
        '9': 'IP tidak valid',
        '27': 'Batas frekuensi tercapai, coba lagi dalam 1 jam',
        '28': 'Rate limit tercapai',
        '88': 'Permintaan gagal',
        '99': 'Sistem error',
        '102': 'Akun dinonaktifkan',
      }
      
      return {
        success: false,
        error: errorMessages[result.code] || result.result || 'Gagal mengirim OTP'
      }
    }
  } catch (error) {
    console.error('[nxcloud] Error:', error)
    return {
      success: false,
      error: 'Gagal menghubungi layanan SMS'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Nomor telepon diperlukan' },
        { status: 400 }
      )
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    
    if (!isValidIndonesianPhone(cleanedPhone)) {
      return NextResponse.json(
        { error: 'Format nomor telepon tidak valid. Gunakan format 8xxxxxxxxxx atau 08xxxxxxxxxx' },
        { status: 400 }
      )
    }
    
    const normalizedPhone = normalizePhone(cleanedPhone)

    const supabase = await createClient()
    
    // Check if phone already verified in download registrations
    const { data: existing } = await supabase
      .from('download_registrations')
      .select('is_verified, otp_expires_at')
      .eq('phone_number', normalizedPhone)
      .single()
    
    if (existing?.is_verified) {
      return NextResponse.json(
        { error: 'Anda sudah terdaftar. Silakan tunggu app diluncurkan. Terima kasih!', alreadyRegistered: true },
        { status: 400 }
      )
    }

    // Check rate limiting - prevent resending too quickly (60 seconds)
    if (existing?.otp_expires_at) {
      const expiresAt = new Date(existing.otp_expires_at)
      const createdAt = new Date(expiresAt.getTime() - 5 * 60 * 1000) // OTP created 5 mins before expiry
      const timeSinceCreated = Date.now() - createdAt.getTime()
      
      if (timeSinceCreated < 60 * 1000) { // Less than 60 seconds
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceCreated) / 1000)
        return NextResponse.json(
          { error: `Tunggu ${waitSeconds} detik sebelum mengirim ulang OTP`, waitSeconds },
          { status: 429 }
        )
      }
    }

    // Generate OTP and set expiry (5 minutes)
    const otp = generateOTP()
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    
    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Send OTP via nxcloud
    const sendResult = await sendOTPViaNxcloud(normalizedPhone, otp)
    
    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Gagal mengirim OTP' },
        { status: 500 }
      )
    }

    // Upsert registration record
    const { error: upsertError } = await supabase
      .from('download_registrations')
      .upsert({
        phone_number: normalizedPhone,
        otp_code: otp,
        otp_expires_at: otpExpiresAt,
        is_verified: false,
        ip_address: ip,
        user_agent: userAgent,
        coupon_amount: 10000, // 10000 IDR coupon
        nxcloud_message_id: sendResult.messageId,
      }, {
        onConflict: 'phone_number'
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      // Still return success since SMS was sent
    }

    console.log(`[PinGo] OTP sent to +62${normalizedPhone}, messageId: ${sendResult.messageId}`)

    return NextResponse.json({
      success: true,
      message: 'Kode OTP telah dikirim ke WhatsApp Anda',
      messageId: sendResult.messageId,
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
