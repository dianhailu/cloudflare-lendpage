import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
      .from('download_registrations')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single()

    if (fetchError || !registration) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak ditemukan. Silakan minta OTP baru.' },
        { status: 404 }
      )
    }

    // Check if already verified
    if (registration.is_verified) {
      return NextResponse.json(
        { 
          error: 'Nomor telepon sudah terverifikasi', 
          alreadyVerified: true,
          couponAmount: registration.coupon_amount 
        },
        { status: 400 }
      )
    }

    // Check OTP expiry
    if (new Date(registration.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (registration.otp_code !== cleanedOtp) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid' },
        { status: 400 }
      )
    }

    // Update registration as verified
    const { error: updateError } = await supabase
      .from('download_registrations')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        otp_code: null, // Clear OTP after verification
      })
      .eq('phone_number', normalizedPhone)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat verifikasi' },
        { status: 500 }
      )
    }

    // TODO: 在这里调用回调验证接口（如果需要）
    // 示例:
    // await fetch('YOUR_CALLBACK_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     phone: `+62${normalizedPhone}`,
    //     verified: true,
    //     coupon_amount: registration.coupon_amount,
    //     verified_at: new Date().toISOString()
    //   })
    // })

    return NextResponse.json({
      success: true,
      message: 'Verifikasi berhasil!',
      couponAmount: registration.coupon_amount || 10000
    })

  } catch (error) {
    console.error('Verify WhatsApp OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
