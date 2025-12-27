"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassButtonProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function GlassButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  className,
}: GlassButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl backdrop-blur-xl border transition-all duration-200 text-left flex items-center gap-3",
        isActive
          ? "bg-white/[0.15] border-white/30 text-white"
          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white",
        className
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
