import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  getClientIP,
  isIPBlacklisted,
  checkIPRateLimit,
  recordIPRequest,
  logSecurityEvent,
} from '@/lib/security'

// Helper function to handle verification failure tracking
async function handleVerificationFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  normalizedPhone: string,
  registration: {
    daily_fail_count?: number | null;
    daily_fail_date?: string | null;
    consecutive_fail_days?: number | null;
  }
): Promise<{ isBanned: boolean; dailyLimitReached: boolean; remainingAttempts: number }> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  let newDailyFailCount = 1
  let newConsecutiveFailDays = registration.consecutive_fail_days || 0
  let isBanned = false
  
  if (registration.daily_fail_date === today) {
    // Same day, increment counter
    newDailyFailCount = (registration.daily_fail_count || 0) + 1
  } else if (registration.daily_fail_date === yesterday) {
    // Yesterday had failures, check if we need to increment consecutive days
    if ((registration.daily_fail_count || 0) >= 5) {
      newConsecutiveFailDays = (registration.consecutive_fail_days || 0) + 1
    }
    newDailyFailCount = 1
  } else {
    // More than a day gap, reset consecutive days
    newConsecutiveFailDays = 0
    newDailyFailCount = 1
  }
  
  // Check if should be banned (3 consecutive days with 5+ failures each)
  // We ban when this is the 3rd consecutive day AND they've hit 5 failures today
  if (newConsecutiveFailDays >= 2 && newDailyFailCount >= 5) {
    isBanned = true
  }
  
  // Update the record
  const updateData: Record<string, unknown> = {
    daily_fail_count: newDailyFailCount,
    daily_fail_date: today,
    consecutive_fail_days: newConsecutiveFailDays,
  }
  
  if (isBanned) {
    updateData.is_banned = true
    updateData.banned_at = new Date().toISOString()
  }
  
  await supabase
    .from('registrations')
    .update(updateData)
    .eq('phone_number', normalizedPhone)
  
  const dailyLimitReached = newDailyFailCount >= 5
  const remainingAttempts = Math.max(0, 5 - newDailyFailCount)
  
  return { isBanned, dailyLimitReached, remainingAttempts }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // ========== 安全检查 1: IP黑名单 ==========
    const blacklistCheck = await isIPBlacklisted(ip)
    if (blacklistCheck.blocked) {
      await logSecurityEvent('blocked_ip_verify_attempt', ip, undefined, { reason: blacklistCheck.reason }, userAgent)
      return NextResponse.json(
        { error: 'Akses ditolak.' },
        { status: 403 }
      )
    }

    // ========== 安全检查 2: IP限流 ==========
    const rateLimitCheck = await checkIPRateLimit(ip, 'verify_otp')
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent('verify_rate_limit_exceeded', ip, undefined, { type: 'verify_otp' }, userAgent)
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      )
    }

    // 记录请求
    await recordIPRequest(ip, 'verify_otp')

    const { phoneNumber, otpCode } = await request.json()
    
    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { error: 'Nomor telepon dan kode OTP diperlukan' },
        { status: 400 }
      )
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    const cleanedOtp = otpCode.replace(/\D/g, '')
    
    // Normalize phone to standard format (8xxx without leading 0)
    const normalizedPhone = cleanedPhone.startsWith('08') 
      ? cleanedPhone.substring(1) 
      : cleanedPhone

    if (cleanedOtp.length !== 6) {
      return NextResponse.json(
        { error: 'Kode OTP harus 6 digit' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get registration record
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single()

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak ditemukan. Silakan minta OTP baru.' },
        { status: 404 }
      )
    }

    // Check if phone is permanently banned
    if (registration.is_banned) {
      return NextResponse.json(
        { error: 'Nomor telepon ini telah diblokir karena terlalu banyak percobaan gagal. Silakan hubungi customer service.' },
        { status: 403 }
      )
    }

    // Check daily failure limit before attempting verification
    const today = new Date().toISOString().split('T')[0]
    if (registration.daily_fail_date === today && registration.daily_fail_count >= 5) {
      return NextResponse.json(
        { error: 'Anda telah melebihi batas percobaan hari ini. Silakan coba lagi besok.' },
        { status: 429 }
      )
    }

    // Check if already verified
    if (registration.is_verified) {
      return NextResponse.json(
        { error: 'Anda sudah terdaftar. Silakan tunggu app diluncurkan. Terima kasih!', alreadyVerified: true },
        { status: 400 }
      )
    }

    // Check OTP expiry
    if (new Date(registration.otp_expires_at) < new Date()) {
      // Record as a failure (expired OTP counts as failure)
      await handleVerificationFailure(supabase, normalizedPhone, registration)
      return NextResponse.json(
        { error: 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (registration.otp_code !== cleanedOtp) {
      // 记录验证失败事件
      await logSecurityEvent('otp_verification_failed', ip, normalizedPhone, {
        attempt_count: (registration.daily_fail_count || 0) + 1
      }, userAgent)
      
      // Record verification failure
      const { isBanned, dailyLimitReached, remainingAttempts } = await handleVerificationFailure(
        supabase, 
        normalizedPhone, 
        registration
      )
      
      if (isBanned) {
        await logSecurityEvent('phone_banned', ip, normalizedPhone, { reason: 'consecutive_failures' }, userAgent)
        return NextResponse.json(
          { error: 'Nomor telepon ini telah diblokir karena terlalu banyak percobaan gagal. Silakan hubungi customer service.' },
          { status: 403 }
        )
      }
      
      if (dailyLimitReached) {
        await logSecurityEvent('daily_limit_reached', ip, normalizedPhone, {}, userAgent)
        return NextResponse.json(
          { error: 'Anda telah melebihi batas percobaan hari ini. Silakan coba lagi besok.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: `Kode OTP tidak valid. Sisa percobaan: ${remainingAttempts}` },
        { status: 400 }
      )
    }

    // Update registration as verified and reset failure counters
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        otp_code: null, // Clear OTP after verification
        daily_fail_count: 0, // Reset failure count on success
        consecutive_fail_days: 0, // Reset consecutive days on success
      })
      .eq('phone_number', normalizedPhone)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat verifikasi' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Selamat datang di PinGo.',
    })

  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
