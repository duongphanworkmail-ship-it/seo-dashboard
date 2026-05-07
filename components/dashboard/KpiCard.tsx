"use client"

import { Card } from "@/components/ui/Card"
import { twMerge } from "tailwind-merge"

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: number
  trendInverted?: boolean
  comparisonValue?: string
  loading?: boolean
  className?: string
}

export function KpiCard({
  label, value, sub, trend, trendInverted, comparisonValue, loading, className,
}: KpiCardProps) {
  const isGood = trend === undefined ? false : trendInverted ? trend < 0 : trend >= 0

  return (
    <Card className={twMerge("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      )}
      <div className="flex items-center gap-2 text-xs">
        {sub && <span className="text-gray-400">{sub}</span>}
        {trend !== undefined && !loading && (
          <span className={isGood ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
            {isGood ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
        {comparisonValue && !loading && (
          <span className="text-gray-400">vs {comparisonValue}</span>
        )}
      </div>
    </Card>
  )
}
