"use client"

import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"

export interface Filters {
  propertyId: string
  startDate: string
  endDate: string
  device: string
}

interface Property {
  id: string
  name: string
  type: string
}

interface FilterBarProps {
  filters: Filters
  properties: Property[]
  onChange: (f: Filters) => void
  onRefresh?: () => void
  loading?: boolean
}

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "28d", days: 28 },
  { label: "90d", days: 90 },
]

function toIso(date: Date) {
  return date.toISOString().split("T")[0]
}

export function FilterBar({
  filters,
  properties,
  onChange,
  onRefresh,
  loading,
}: FilterBarProps) {
  function setPreset(days: number) {
    const end = new Date()
    const start = new Date(Date.now() - days * 86400_000)
    onChange({ ...filters, startDate: toIso(start), endDate: toIso(end) })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-200">
      <Select
        label="Property"
        value={filters.propertyId}
        onChange={(e) => onChange({ ...filters, propertyId: e.target.value })}
        className="min-w-[180px]"
      >
        <option value="">Select property…</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.type})
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">Start Date</label>
        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600">End Date</label>
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Select
        label="Device"
        value={filters.device}
        onChange={(e) => onChange({ ...filters, device: e.target.value })}
      >
        <option value="ALL">All devices</option>
        <option value="DESKTOP">Desktop</option>
        <option value="MOBILE">Mobile</option>
        <option value="TABLET">Tablet</option>
      </Select>

      <div className="flex items-end gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.days)}
            className="px-3 py-2 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
          >
            {p.label}
          </button>
        ))}
      </div>

      {onRefresh && (
        <Button
          variant="secondary"
          size="md"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </Button>
      )}
    </div>
  )
}
