"use client"

import { useState, useEffect } from "react"

type Step = "phone" | "success" | "already_claimed"

// Success step
function SuccessStep({ 
  onClose, 
  apkUrl 
}: { 
  onClose: () => void
  apkUrl?: string 
}) {
  useEffect(() => {
    if (apkUrl) {
      window.location.href = apkUrl
    }
  }, [apkUrl])

  const handleDownload = () => {
    if (apkUrl) {
      window.location.href = apkUrl
    }
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Success Icon */}
      <div style={{ 
        width: "64px", 
        height: "64px", 
        borderRadius: "50%", 
        backgroundColor: "rgba(22,163,74,0.1)", 
        lineHeight: "64px",
        fontSize: "32px",
        color: "#16a34a",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: "12px",
      }}>
        &#10003;
      </div>
      
      {/* Success Title */}
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a2e1a", margin: "0 0 12px 0" }}>
        Selamat, Kupon Anda Berhasil!
      </h2>

      {/* Coupon Card */}
      <div style={{ 
        backgroundColor: "#16a34a", 
        borderRadius: "12px", 
        padding: "16px",
        color: "#ffffff",
        marginBottom: "16px",
      }}>
        <div style={{ fontSize: "14px", marginBottom: "4px" }}>Anda mendapatkan kupon</div>
        <div style={{ fontSize: "32px", fontWeight: 900 }}>Rp 10.000</div>
        <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>Untuk pinjaman pertama Anda</div>
      </div>

      {/* Download Notice */}
      {apkUrl && (
        <div style={{ 
          backgroundColor: "rgba(22,163,74,0.05)", 
          border: "1px solid rgba(22,163,74,0.2)", 
          borderRadius: "12px", 
          padding: "12px",
          marginBottom: "16px",
          textAlign: "left",
        }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a", marginBottom: "4px" }}>
            Unduhan Otomatis Dimulai
          </div>
          <div style={{ fontSize: "12px", color: "#6b7c6b", lineHeight: 1.4 }}>
            Aplikasi PinGo sedang diunduh. Jika tidak dimulai otomatis, tekan tombol di bawah.
          </div>
        </div>
      )}

      {/* Download Button */}
      {apkUrl && (
        <button
          onClick={handleDownload}
          type="button"
          style={{ 
            display: "block",
            width: "100%",
            height: "48px",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            marginBottom: "12px",
            cursor: "pointer",
          }}
        >
          Unduh Aplikasi PinGo
        </button>
      )}

      <button
        onClick={onClose}
        type="button"
        style={{ 
          display: "block",
          width: "100%",
          height: "44px",
          backgroundColor: "#ffffff",
          color: "#1a2e1a",
          border: "1px solid #e2e8e2",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Selesai
      </button>
    </div>
  )
}

// Already claimed step
function AlreadyClaimedStep({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Info Icon */}
      <div style={{ 
        width: "64px", 
        height: "64px", 
        borderRadius: "50%", 
        backgroundColor: "rgba(251,191,36,0.1)", 
        lineHeight: "64px",
        fontSize: "32px",
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: "12px",
      }}>
        &#9888;
      </div>
      
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a2e1a", margin: "0 0 8px 0" }}>
        Kupon Sudah Diklaim
      </h2>

      <p style={{ fontSize: "14px", color: "#6b7c6b", margin: "0 0 16px 0" }}>
        Nomor HP ini sudah pernah mengklaim kupon sebelumnya.
      </p>

      {/* Info Card */}
      <div style={{ 
        backgroundColor: "rgba(251,191,36,0.1)", 
        border: "1px solid rgba(251,191,36,0.3)", 
        borderRadius: "12px", 
        padding: "12px",
        marginBottom: "16px",
        textAlign: "left",
      }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#92400e" }}>
          Kupon Anda masih berlaku!
        </div>
        <div style={{ fontSize: "12px", color: "#a16207", marginTop: "4px" }}>
          Silakan download aplikasi PinGo dan gunakan kupon Anda.
        </div>
      </div>

      <button
        onClick={onClose}
        type="button"
        style={{ 
          display: "block",
          width: "100%",
          height: "48px",
          backgroundColor: "#facc15",
          color: "#713f12",
          border: "none",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Mengerti
      </button>
    </div>
  )
}

interface CouponClaimFormProps {
  refCode?: string | null
  channel?: string | null
  apkUrl?: string
}

export function CouponClaimForm({ refCode, channel, apkUrl }: CouponClaimFormProps) {
  const [step, setStep] = useState<Step>("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Indonesian phone prefixes
  const VALID_PREFIXES = [
    '811', '812', '813', '821', '822', '823', '851', '852', '853',
    '814', '815', '816', '855', '856', '857', '858',
    '817', '818', '819', '859', '877', '878',
    '831', '832', '833', '838',
    '895', '896', '897', '898', '899',
    '881', '882', '883', '884', '885', '886', '887', '888', '889',
  ]

  const isValidPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "")
    let normalized = cleaned
    if (cleaned.startsWith('0')) {
      normalized = cleaned.substring(1)
    }
    if (normalized.length < 9 || normalized.length > 12) {
      return false
    }
    if (!normalized.startsWith('8')) {
      return false
    }
    const prefix = normalized.substring(0, 3)
    if (!VALID_PREFIXES.includes(prefix)) {
      return false
    }
    return true
  }

  const formatPhoneDisplay = (value: string): string => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 8) return cleaned.slice(0, 4) + "-" + cleaned.slice(4)
    return cleaned.slice(0, 4) + "-" + cleaned.slice(4, 8) + "-" + cleaned.slice(8, 13)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d-]/g, "")
    const cleaned = value.replace(/-/g, "")
    if (cleaned.length <= 13) {
      setPhoneNumber(cleaned)
      setError("")
    }
  }

  const handleSubmit = async () => {
    if (!phoneNumber) {
      setError("Masukkan nomor telepon Anda")
      return
    }

    if (!isValidPhone(phoneNumber)) {
      setError("Nomor telepon tidak valid")
      return
    }

    setIsLoading(true)
    setError("")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch("/api/claim-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber,
          refCode,
          channel,
          sourceUrl: window.location.href,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      if (!response.ok) {
        if (data.alreadyClaimed) {
          setStep("already_claimed")
        } else {
          setError(data.error || "Gagal mengklaim kupon")
        }
        return
      }

      setStep("success")
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        setError("Koneksi timeout. Coba lagi.")
      } else {
        setError("Kesalahan jaringan. Coba lagi.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep("phone")
    setPhoneNumber("")
    setError("")
  }

  if (step === "success") {
    return <SuccessStep onClose={handleClose} apkUrl={apkUrl} />
  }

  if (step === "already_claimed") {
    return <AlreadyClaimedStep onClose={handleClose} />
  }

  // Phone Input Step - using TABLE layout for maximum compatibility
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a2e1a", margin: "0 0 4px 0" }}>
          Masukkan Nomor HP Anda
        </h3>
        <p style={{ fontSize: "12px", color: "#6b7c6b", margin: 0 }}>
          Gratis! Tidak ada biaya apapun
        </p>
      </div>

      {/* Phone input using TABLE layout */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <tbody>
          <tr>
            <td style={{ width: "72px", verticalAlign: "middle", paddingRight: "8px" }}>
              <div style={{ 
                backgroundColor: "#f0f4f0", 
                border: "1px solid #e2e8e2", 
                borderRadius: "8px",
                padding: "14px 8px",
                textAlign: "center",
              }}>
                <span style={{ 
                  display: "inline-block", 
                  width: "20px", 
                  height: "14px", 
                  verticalAlign: "middle", 
                  marginRight: "4px",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}>
                  <span style={{ display: "block", height: "7px", backgroundColor: "#dc2626" }}></span>
                  <span style={{ display: "block", height: "7px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8e2" }}></span>
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a2e1a", verticalAlign: "middle" }}>+62</span>
              </div>
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <input
                type="tel"
                placeholder="812-3456-7890"
                value={formatPhoneDisplay(phoneNumber)}
                onChange={handlePhoneChange}
                disabled={isLoading}
                style={{ 
                  width: "100%", 
                  height: "48px", 
                  padding: "0 12px",
                  fontSize: "16px",
                  fontWeight: 500,
                  backgroundColor: "#ffffff",
                  color: "#1a2e1a",
                  border: "1px solid #e2e8e2",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Error message */}
      {error && (
        <div style={{ 
          backgroundColor: "rgba(220,38,38,0.1)", 
          border: "1px solid rgba(220,38,38,0.3)", 
          borderRadius: "8px", 
          padding: "10px 12px",
          marginBottom: "12px",
        }}>
          <span style={{ fontSize: "13px", color: "#dc2626" }}>{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !phoneNumber}
        type="button"
        style={{ 
          display: "block",
          width: "100%",
          height: "52px",
          backgroundColor: isLoading || !phoneNumber ? "#d1d5db" : "#facc15",
          color: isLoading || !phoneNumber ? "#9ca3af" : "#713f12",
          border: "none",
          borderRadius: "16px",
          fontSize: "15px",
          fontWeight: 800,
          cursor: isLoading || !phoneNumber ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "Memproses..." : "KLAIM KUPON SEKARANG"}
      </button>

      {/* Privacy note */}
      <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", marginTop: "12px", lineHeight: 1.4, margin: "12px 0 0 0" }}>
        Dengan mengklaim, Anda menyetujui Syarat & Ketentuan kami.
      </p>
    </div>
  )
}
