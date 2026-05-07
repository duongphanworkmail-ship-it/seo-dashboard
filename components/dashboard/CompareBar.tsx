"use client"

import { computeComparisonDates, type ComparisonState } from "@/lib/comparison"

interface CompareBarProps {
  startDate: string
  endDate: string
  value: ComparisonState
  onChange: (c: ComparisonState) => void
}

const TYPE_LABELS: Record<ComparisonState["type"], string> = {
  previous: "Previous period",
  year:     "Previous year",
  custom:   "Custom range",
}

export function CompareBar({ startDate, endDate, value, onChange }: CompareBarProps) {
  const dates = computeComparisonDates(startDate, endDate, value)

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-xs">
      <button
        onClick={() => onChange({ ...value, enabled: !value.enabled })}
        className={`px-3 py-1.5 font-medium rounded-lg border transition-colors ${
          value.enabled
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
        }`}
      >
        Compare
      </button>

      {value.enabled && (
        <>
          <div className="flex gap-1">
            {(Object.keys(TYPE_LABELS) as ComparisonState["type"][]).map((t) => (
              <button
                key={t}
                onClick={() => onChange({ ...value, type: t })}
                className={`px-2.5 py-1 rounded-md border transition-colors ${
                  value.type === t
                    ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                    : "text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {value.type === "custom" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={value.customStart}
                max={value.customEnd || startDate}
                onChange={(e) => onChange({ ...value, customStart: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={value.customEnd}
                min={value.customStart}
                max={startDate}
                onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
                className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : dates ? (
            <span className="text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1">
              vs{" "}
              <span className="font-medium text-gray-700">{dates.start}</span>
              {" → "}
              <span className="font-medium text-gray-700">{dates.end}</span>
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}
