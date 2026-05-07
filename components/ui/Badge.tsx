"use client"

import { twMerge } from "tailwind-merge"

interface BadgeProps {
  children: React.ReactNode
  variant?: "blue" | "green" | "yellow" | "red" | "gray"
  className?: string
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  const variants = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
  }

  return (
    <span
      className={twMerge(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
