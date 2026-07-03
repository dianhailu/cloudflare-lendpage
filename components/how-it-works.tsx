import { Smartphone, FileCheck, Wallet } from "lucide-react"

const steps = [
  {
    icon: Smartphone,
    step: "01",
    title: "Daftar & Download",
    description: "Masukkan nomor HP dan download aplikasi PinGo",
  },
  {
    icon: FileCheck,
    step: "02",
    title: "Lengkapi Data",
    description: "Isi data diri dan upload dokumen yang diperlukan",
  },
  {
    icon: Wallet,
    step: "03",
    title: "Terima Dana",
    description: "Dana langsung cair ke rekening Anda dalam hitungan menit",
  },
]

export function HowItWorks() {
  return (
    <section className="py-10 px-4" style={{ backgroundColor: "#f5f7f5" }}>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-7">
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#16a34a" }}>Mudah & Cepat</p>
          <h2 className="text-2xl font-extrabold" style={{ color: "#1a2e1a" }}>
            Cara Mengajukan Pinjaman
          </h2>
        </div>

        <div className="relative">
          {steps.map((item, index) => (
            <div key={index} className="flex gap-4 items-stretch">
              {/* left column: number + connector */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  <item.icon className="w-5 h-5" style={{ color: "#ffffff" }} />
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 flex-1 my-1" style={{ minHeight: "24px", backgroundColor: "rgba(22,163,74,0.2)" }} />
                )}
              </div>

              {/* right column: content */}
              <div className={`pb-6 pt-1 ${index === steps.length - 1 ? "pb-0" : ""}`}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: "rgba(22,163,74,0.5)" }}>
                  Langkah {item.step}
                </span>
                <h3 className="text-base font-bold mt-0.5" style={{ color: "#1a2e1a" }}>{item.title}</h3>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#6b7c6b" }}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
