import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div 
      className="flex flex-col items-start p-4 rounded-2xl shadow-sm"
      style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8e2" }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
      >
        <Icon className="w-5 h-5" style={{ color: "#16a34a" }} />
      </div>
      <h3 className="text-sm font-bold mb-1" style={{ color: "#1a2e1a" }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: "#6b7c6b" }}>{description}</p>
    </div>
  )
}
