"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle, ArrowRight, Phone, Shield, AlertCircle, Gift, PartyPopper } from "lucide-react"
import { SliderCaptcha } from "@/components/slider-captcha"

type Step = "phone" | "otp" | "success"

// Success step component with coupon display
function SuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-5 text-center">
      {/* Success Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
        <CheckCircle className="w-12 h-12 text-primary" />
      </div>
      
      {/* Success Title */}
      <div className="flex items-center justify-center gap-2">
        <PartyPopper className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-bold text-foreground">Pendaftaran Berhasil!</h2>
        <PartyPopper className="w-5 h-5 text-amber-500 scale-x-[-1]" />
      </div>

      <p className="text-sm text-muted-foreground">
        Selamat! Anda telah berhasil terdaftar.
      </p>

      {/* Coupon Card */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Gift className="w-5 h-5" />
            <span className="text-sm font-medium">Anda mendapatkan kupon</span>
          </div>
          <p className="text-3xl font-bold">Rp 10.000</p>
          <p className="text-xs text-primary-foreground/80 mt-1">Dapat digunakan untuk pinjaman pertama Anda</p>
        </div>
      </div>

      {/* App Coming Soon Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Aplikasi pinjaman akan segera diluncurkan!</span>
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Setelah app tersedia, Anda dapat langsung mengajukan pinjaman. Nantikan ya!
        </p>
      </div>

      <Button
        onClick={onClose}
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        Mengerti
      </Button>
    </div>
  )
}

// 生成请求签名 (与后端保持一致)
function generateSignature(timestamp: number, phoneNumber: string): string {
  const secret = 'pingo-otp-secret-2026'
  const data = `${timestamp}:${phoneNumber}:${secret}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

interface RegistrationFormProps {
  refCode?: string | null
  channel?: string | null
}

export function RegistrationForm({ refCode, channel }: RegistrationFormProps) {
  const [step, setStep] = useState<Step>("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState("") // 蜜罐字段，正常用户不会填写
  const [captchaToken, setCaptchaToken] = useState<string | null>(null) // 滑块验证码 token
  const [showCaptcha, setShowCaptcha] = useState(false) // 是否显示验证码
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 印尼手机号运营商前缀
  // Telkomsel: 811, 812, 813, 821, 822, 823, 851, 852, 853
  // Indosat: 814, 815, 816, 855, 856, 857, 858
  // XL: 817, 818, 819, 859, 877, 878
  // Axis: 831, 832, 833, 838
  // Three: 895, 896, 897, 898, 899
  // Smartfren: 881, 882, 883, 884, 885, 886, 887, 888, 889
  const VALID_PREFIXES = [
    '811', '812', '813', '821', '822', '823', '851', '852', '853', // Telkomsel
    '814', '815', '816', '855', '856', '857', '858', // Indosat
    '817', '818', '819', '859', '877', '878', // XL
    '831', '832', '833', '838', // Axis
    '895', '896', '897', '898', '899', // Three
    '881', '882', '883', '884', '885', '886', '887', '888', '889', // Smartfren
  ]

  // Validate Indonesian phone format with carrier prefix check
  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "")
    
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

  // Format phone number for display
  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 13)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d-]/g, "")
    const cleaned = value.replace(/-/g, "")
    if (cleaned.length <= 13) {
      setPhoneNumber(cleaned)
      setError("")
    }
  }

  // 处理手机号提交（先显示验证码）
  const handlePhoneSubmit = () => {
    if (!phoneNumber) {
      setError("Masukkan nomor telepon Anda")
      return
    }

    if (!isValidPhone(phoneNumber)) {
      setError("Nomor telepon tidak valid. Pastikan menggunakan nomor Indonesia yang benar (contoh: 812xxxxxxxx)")
      return
    }

    setError("")
    setShowCaptcha(true)
  }

  // 验证码通过后发送OTP
  const handleCaptchaVerified = (token: string) => {
    setCaptchaToken(token)
    handleSendOTP(token)
  }

  // 重置验证码
  const handleCaptchaReset = () => {
    setCaptchaToken(null)
  }

  const handleSendOTP = async (token?: string) => {
    const captcha = token || captchaToken
    
    if (!captcha) {
      setError("Silakan selesaikan verifikasi terlebih dahulu")
      return
    }

    if (!phoneNumber) {
      setError("Masukkan nomor telepon Anda")
      return
    }

    if (!isValidPhone(phoneNumber)) {
      setError("Nomor telepon tidak valid. Pastikan menggunakan nomor Indonesia yang benar (contoh: 812xxxxxxxx)")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // 生成时间戳和签名
      const timestamp = Date.now()
      const signature = generateSignature(timestamp, phoneNumber)
      
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber,
          honeypot, // 蜜罐字段
          timestamp,
          signature,
          captchaToken: captcha, // 滑块验证码 token
          refCode, // 短链接来源码
          channel // 渠道
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.alreadyRegistered) {
          setError("Anda sudah terdaftar. Silakan tunggu app diluncurkan. Terima kasih!")
        } else {
          setError(data.error || "Gagal mengirim OTP")
        }
        return
      }

      // For demo purposes
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp)
      }

      setStep("otp")
      setCountdown(60)
      setShowCaptcha(false) // 隐藏验证码
      setCaptchaToken(null) // 重置 token
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch {
      setError("Terjadi kesalahan jaringan")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otpCode]
    newOtp[index] = value.slice(-1)
    setOtpCode(newOtp)
    setError("")

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newOtp.every((digit) => digit) && newOtp.join("").length === 6) {
      handleVerifyOTP(newOtp.join(""))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("")
      setOtpCode(newOtp)
      handleVerifyOTP(pastedData)
    }
  }

  const handleVerifyOTP = async (code?: string) => {
    const otpToVerify = code || otpCode.join("")
    
    if (otpToVerify.length !== 6) {
      setError("Masukkan 6 digit kode OTP")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otpCode: otpToVerify }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Verifikasi gagal")
        return
      }

      setStep("success")
    } catch {
      setError("Terjadi kesalahan jaringan")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    setOtpCode(["", "", "", "", "", ""])
    // 重发时需要重新验证
    setShowCaptcha(true)
    setCaptchaToken(null)
    setStep("phone")
  }

  const handleClose = () => {
    // Reset form to initial state
    setStep("phone")
    setPhoneNumber("")
    setOtpCode(["", "", "", "", "", ""])
    setError("")
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-3 h-3 rounded-full transition-colors ${step === "phone" ? "bg-primary" : "bg-primary/30"}`} />
        <div className={`w-8 h-0.5 transition-colors ${step !== "phone" ? "bg-primary" : "bg-muted"}`} />
        <div className={`w-3 h-3 rounded-full transition-colors ${step === "otp" ? "bg-primary" : step === "success" ? "bg-primary/30" : "bg-muted"}`} />
        <div className={`w-8 h-0.5 transition-colors ${step === "success" ? "bg-primary" : "bg-muted"}`} />
        <div className={`w-3 h-3 rounded-full transition-colors ${step === "success" ? "bg-primary" : "bg-muted"}`} />
      </div>

      {/* Phone Input Step */}
      {step === "phone" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Masukkan Nomor HP</h2>
            <p className="text-sm text-muted-foreground mt-1">Kami akan mengirim kode verifikasi</p>
          </div>

          {/* WhatsApp Only Notice */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.112 1.522 5.837L.057 23.882l6.197-1.443A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.001-1.371l-.357-.212-3.721.865.934-3.63-.232-.372A9.772 9.772 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
            </svg>
            <p className="text-xs text-green-800 font-medium">
              Hanya nomor yang aktif di WhatsApp yang dapat mendaftar
            </p>
          </div>

          <div className="space-y-3">
            {/* 蜜罐字段 - 对用户隐藏，机器人会填写 */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute -left-[9999px] opacity-0 h-0 w-0"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            
            <div className="flex items-center gap-2 w-full">
              <div className="flex items-center justify-center gap-1 h-12 px-2.5 bg-muted rounded-lg border border-border shrink-0">
                {/* 印尼国旗 - 使用 CSS 渲染避免 hydration 问题 */}
                <div className="w-5 h-3.5 rounded-[2px] overflow-hidden flex flex-col">
                  <div className="flex-1 bg-red-600" />
                  <div className="flex-1 bg-white" />
                </div>
                <span className="text-xs font-semibold text-foreground">+62</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="tel"
                  placeholder="812-3456-7890"
                  value={formatPhoneDisplay(phoneNumber)}
                  onChange={handlePhoneChange}
                  className="w-full h-12 px-3 text-base tracking-wide font-medium bg-card text-foreground border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Masukkan nomor HP Indonesia (contoh: 812-3456-7890)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 滑块验证码 - 点击继续后显示 */}
          {showCaptcha && (
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
              <SliderCaptcha 
                onVerified={handleCaptchaVerified}
                onReset={handleCaptchaReset}
              />
            </div>
          )}

          <Button
            onClick={showCaptcha ? () => {} : handlePhoneSubmit}
            disabled={isLoading || !phoneNumber || (showCaptcha && !captchaToken)}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <Spinner className="w-5 h-5" />
            ) : showCaptcha ? (
              captchaToken ? (
                <>
                  Mengirim OTP...
                  <Spinner className="w-5 h-5 ml-2" />
                </>
              ) : (
                "Selesaikan verifikasi di atas"
              )
            ) : (
              <>
                Lanjutkan
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* OTP Input Step */}
      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Verifikasi OTP</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Kode dikirim ke <span className="font-medium text-foreground">{formatPhoneDisplay(phoneNumber)}</span>
            </p>
          </div>

          {/* WhatsApp Notice */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.6 6.3L7.8 16.1m0 0l-3.5-3.5m10 7.5l-4.7-4.7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-green-900">Kode OTP dikirim melalui WhatsApp</p>
              <p className="text-xs text-green-700 mt-0.5">Anda hanya akan menerima verifikasi melalui WhatsApp</p>
            </div>
          </div>

          {/* Demo OTP Notice */}
          {demoOtp && (
            <div className="p-3 bg-accent/20 border border-accent/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Demo Mode - Kode OTP Anda:</p>
              <p className="text-2xl font-bold text-accent tracking-widest">{demoOtp}</p>
            </div>
          )}

          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-1.5 sm:gap-2 px-2" onPaste={handleOtpPaste}>
            {otpCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { otpInputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg bg-card border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <Button
            onClick={() => handleVerifyOTP()}
            disabled={isLoading || otpCode.join("").length !== 6}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? <Spinner className="w-5 h-5" /> : "Verifikasi"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Tidak menerima kode?{" "}
              {countdown > 0 ? (
                <span className="text-foreground">Kirim ulang dalam {countdown}s</span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  className="text-primary font-medium hover:underline"
                  disabled={isLoading}
                >
                  Kirim Ulang
                </button>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setStep("phone")
              setOtpCode(["", "", "", "", "", ""])
              setError("")
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ubah nomor telepon
          </button>
        </div>
      )}

      {/* Success Step */}
      {step === "success" && (
        <SuccessStep onClose={handleClose} />
      )}
    </div>
  )
}
