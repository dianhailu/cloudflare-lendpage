import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  getClientIP,
  isIPBlacklisted,
  checkIPRateLimit,
  recordIPRequest,
  logSecurityEvent,
  detectSuspiciousPattern,
  checkHoneypot,
  verifyRequestSignature
} from '@/lib/security'

// nxcloud API 配置 - 密钥必须通过环境变量配置
const NXCLOUD_API_URL = 'http://api2.nxcloud.com/api/sms/mtsend'
const NXCLOUD_APPKEY = process.env.NXCLOUD_APPKEY || ''
const NXCLOUD_SECRETKEY = process.env.NXCLOUD_SECRETKEY || ''

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 印尼手机号运营商前缀
// Telkomsel: 0811, 0812, 0813, 0821, 0822, 0823, 0851, 0852, 0853
// Indosat: 0814, 0815, 0816, 0855, 0856, 0857, 0858
// XL: 0817, 0818, 0819, 0859, 0877, 0878
// Axis: 0831, 0832, 0833, 0838
// Three: 0895, 0896, 0897, 0898, 0899
// Smartfren: 0881, 0882, 0883, 0884, 0885, 0886, 0887, 0888, 0889
const VALID_PREFIXES = [
  '811', '812', '813', '821', '822', '823', '851', '852', '853', // Telkomsel
  '814', '815', '816', '855', '856', '857', '858', // Indosat
  '817', '818', '819', '859', '877', '878', // XL
  '831', '832', '833', '838', // Axis
  '895', '896', '897', '898', '899', // Three
  '881', '882', '883', '884', '885', '886', '887', '888', '889', // Smartfren
]

// Validate Indonesian phone number with carrier prefix check
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

// Normalize phone number to standard format (8xxx without leading 0)
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  // Remove leading 0 if present, store as 8xxx format
  if (cleaned.startsWith('08')) {
    return cleaned.substring(1)
  }
  if (cleaned.startsWith('628')) {
    return cleaned.substring(2)
  }
  return cleaned
}

// Send OTP via nxcloud SMS API
async function sendOTPViaNxcloud(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // nxcloud 要求手机号格式: 国码+手机号，如 628xxxxxxxxxx
    const fullPhone = `62${phone}`
    
    // OTP 短信内容 (印尼语)
    const content = `[PinGo] Kode verifikasi Anda adalah: ${otp}. Berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.`
    
    // 构建请求参数
    const params = new URLSearchParams({
      appkey: NXCLOUD_APPKEY,
      secretkey: NXCLOUD_SECRETKEY,
      phone: fullPhone,
      content: content
    })

    // 检查环境变量是否配置
    if (!NXCLOUD_APPKEY || !NXCLOUD_SECRETKEY) {
      console.error('[nxcloud] Missing NXCLOUD_APPKEY or NXCLOUD_SECRETKEY')
      return {
        success: false,
        error: 'SMS service not configured'
      }
    }

    const response = await fetch(NXCLOUD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const responseText = await response.text()
    
    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      console.error('[nxcloud] Failed to parse response:', responseText)
      return {
        success: false,
        error: 'Invalid response from SMS service'
      }
    }

    // nxcloud 返回 code: "0" 表示成功
    if (result.code === '0' || result.code === 0) {
      return {
        success: true,
        messageId: result.messageid
      }
    } else {
      // 处理错误码
      const errorMessages: Record<string, string> = {
        '1': 'Konfigurasi layanan SMS tidak valid',
        '2': 'Format data tidak valid',
        '3': 'Saldo tidak mencukupi',
        '4': 'Konten pesan tidak valid',
        '5': 'Pesan terlalu panjang',
        '6': 'Nomor telepon tidak valid',
        '9': 'IP tidak diizinkan',
        '27': 'Terlalu banyak permintaan. Coba lagi dalam 1 jam.',
        '28': 'Batas pengiriman tercapai',
        '88': 'Permintaan gagal',
        '99': 'Kesalahan sistem',
        '102': 'Akun dinonaktifkan',
      }
      
      return {
        success: false,
        error: errorMessages[String(result.code)] || result.result || 'Gagal mengirim OTP'
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
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // ========== 安全检查 1: IP黑名单 ==========
    const blacklistCheck = await isIPBlacklisted(ip)
    if (blacklistCheck.blocked) {
      await logSecurityEvent('blocked_ip_attempt', ip, undefined, { reason: blacklistCheck.reason }, userAgent)
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan hubungi customer service.' },
        { status: 403 }
      )
    }

    // ========== 安全检查 2: IP限流 ==========
    const rateLimitCheck = await checkIPRateLimit(ip, 'send_otp')
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent('rate_limit_exceeded', ip, undefined, { type: 'send_otp' }, userAgent)
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { phoneNumber, honeypot, timestamp, signature, captchaToken, refCode, channel } = body
    
    // ========== 安全检查 3: 滑块验证码 ==========
    if (!captchaToken) {
      await logSecurityEvent('missing_captcha', ip, phoneNumber, {}, userAgent)
      return NextResponse.json(
        { error: 'Silakan selesaikan verifikasi terlebih dahulu' },
        { status: 400 }
      )
    }
    
    // 验证 captcha token 格式和时效性
    const captchaParts = captchaToken.split('_')
    if (captchaParts.length !== 4) {
      await logSecurityEvent('invalid_captcha_format', ip, phoneNumber, { token: captchaToken }, userAgent)
      return NextResponse.json(
        { error: 'Verifikasi tidak valid. Silakan coba lagi.' },
        { status: 400 }
      )
    }
    
    const captchaTimestamp = parseInt(captchaParts[1], 10)
    const captchaAge = Date.now() - captchaTimestamp
    // 验证码有效期 5 分钟
    if (captchaAge > 5 * 60 * 1000) {
      await logSecurityEvent('captcha_expired', ip, phoneNumber, { age: captchaAge }, userAgent)
      return NextResponse.json(
        { error: 'Verifikasi sudah kedaluwarsa. Silakan ulangi.' },
        { status: 400 }
      )
    }
    
    // ========== 安全检查 4: 蜜罐字段 ==========
    if (!checkHoneypot(honeypot)) {
      await logSecurityEvent('honeypot_triggered', ip, phoneNumber, { honeypot_value: honeypot }, userAgent)
      // 静默失败，不告诉攻击者被检测到
      return NextResponse.json({
        success: true,
        message: 'Kode OTP telah dikirim ke nomor Anda'
      })
    }

    // ========== 安全检查 5: 请求签名验证 (可选) ==========
    if (timestamp && signature) {
      if (!verifyRequestSignature(timestamp, signature, phoneNumber || '')) {
        await logSecurityEvent('invalid_signature', ip, phoneNumber, { timestamp, signature }, userAgent)
        return NextResponse.json(
          { error: 'Permintaan tidak valid. Silakan refresh halaman.' },
          { status: 400 }
        )
      }
    }
    
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Nomor telepon diperlukan' },
        { status: 400 }
      )
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    
    if (!isValidIndonesianPhone(cleanedPhone)) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak valid. Pastikan menggunakan nomor Indonesia yang benar (contoh: 812xxxxxxxx)' },
        { status: 400 }
      )
    }
    
    // Normalize to standard format for storage (8xxx format)
    const normalizedPhone = normalizePhone(cleanedPhone)

    // ========== 安全检查 6: 可疑模式检测 ==========
    const suspiciousCheck = await detectSuspiciousPattern(ip, normalizedPhone, userAgent)
    if (suspiciousCheck.suspicious) {
      return NextResponse.json(
        { error: suspiciousCheck.reason },
        { status: 429 }
      )
    }

    const supabase = await createClient()
    
    // Check if phone already verified or banned
    const { data: existing } = await supabase
      .from('registrations')
      .select('is_verified, otp_expires_at, is_banned, daily_fail_count, daily_fail_date, consecutive_fail_days')
      .eq('phone_number', normalizedPhone)
      .single()
    
    if (existing?.is_verified) {
      return NextResponse.json(
        { error: 'Anda sudah terdaftar. Silakan tunggu app diluncurkan. Terima kasih!', alreadyRegistered: true },
        { status: 400 }
      )
    }

    // Check if phone is permanently banned (3 consecutive days with 5+ failures each)
    if (existing?.is_banned) {
      return NextResponse.json(
        { error: 'Nomor telepon ini telah diblokir karena terlalu banyak percobaan gagal. Silakan hubungi customer service.' },
        { status: 403 }
      )
    }

    // Check daily failure limit (5 failures per day)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    if (existing?.daily_fail_date === today && existing?.daily_fail_count >= 5) {
      return NextResponse.json(
        { error: 'Anda telah melebihi batas percobaan hari ini. Silakan coba lagi besok.' },
        { status: 429 }
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

    // 记录IP请求 (在发送���记录，防止滥用)
    await recordIPRequest(ip, 'send_otp')

    // Send OTP via nxcloud SMS
    const sendResult = await sendOTPViaNxcloud(normalizedPhone, otp)
    
    if (!sendResult.success) {
      console.error('[PinGo] Failed to send OTP:', sendResult.error)
      await logSecurityEvent('otp_send_failed', ip, normalizedPhone, { error: sendResult.error }, userAgent)
      return NextResponse.json(
        { error: sendResult.error || 'Gagal mengirim OTP. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    // Upsert registration record
    const { error: upsertError } = await supabase
      .from('registrations')
      .upsert({
        phone_number: normalizedPhone,
        otp_code: otp,
        otp_expires_at: otpExpiresAt,
        is_verified: false,
        ip_address: ip,
        user_agent: userAgent,
        ref_code: refCode || null,
        channel: channel || null,
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
      message: 'Kode OTP telah dikirim ke nomor Anda',
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
