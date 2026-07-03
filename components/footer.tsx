import { Shield, Building2, Headphones } from "lucide-react"

export function Footer() {
  return (
    <footer className="px-4 pt-8 pb-6" style={{ backgroundColor: "#1a2e1a" }}>
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <img
            src="/images/pingo-logo.jpg"
            alt="PinGo Logo"
            width="32"
            height="32"
            className="rounded-lg"
            loading="lazy"
            decoding="async"
            style={{ width: "32px", height: "32px" }}
          />
          <span className="text-xl font-extrabold" style={{ color: "#ffffff" }}>PinGo</span>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-8 mb-5">
          {[
            { icon: Shield, label: "Data Aman" },
            { icon: Building2, label: "Sesuai Regulasi" },
            { icon: Headphones, label: "Support 24/7" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon className="w-5 h-5" style={{ color: "#16a34a" }} />
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* divider */}
        <div className="mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

        {/* Links */}
        <div className="flex justify-center gap-5 mb-4">
          <a href="#" className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Syarat & Ketentuan
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <a href="#" className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Kebijakan Privasi
          </a>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-center leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
          PinGo adalah platform pinjaman online yang beroperasi sesuai dengan peraturan dan standar keuangan yang berlaku.
          Semua proses mengikuti ketentuan regulasi dan standar keamanan industri.
        </p>

        <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          &copy; {new Date().getFullYear()} PT PinGo Finance Indonesia. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  )
}
