"use client"

import { twMerge } from "tailwind-merge"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={twMerge(
        "bg-white rounded-xl border border-gray-200 shadow-sm p-5",
        className
      )}
    >
      {children}
    </div>
  )
}
