"use client";

import { AlertTriangle } from "lucide-react";

interface StaleDataBadgeProps {
  lastFetchedAt: number | null;
}

export function StaleDataBadge({ lastFetchedAt }: StaleDataBadgeProps) {
  if (!lastFetchedAt) return null;

  const diff = Date.now() - lastFetchedAt;
  const mins = Math.floor(diff / 60000);

  let label: string;
  if (mins < 1) label = "Updated just now";
  else if (mins < 60) label = `Updated ${mins} min ago`;
  else label = `Updated ${Math.floor(mins / 60)}h ago`;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-400/70">
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  );
}
