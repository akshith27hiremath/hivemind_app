import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface GlassButtonProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

export function GlassButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: GlassButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl backdrop-blur-xl border transition-colors text-left flex items-center gap-3 ${
        isActive
          ? "bg-white/15 border-white/30"
          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </button>
  );
}