"use client"

export interface DimensionOption {
  value: string
  label: string
}

interface DimensionTabsProps {
  options: DimensionOption[]
  value: string
  onChange: (value: string) => void
}

export function DimensionTabs({ options, value, onChange }: DimensionTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-xs font-medium text-gray-500 self-center mr-1">Group by:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            value === opt.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
