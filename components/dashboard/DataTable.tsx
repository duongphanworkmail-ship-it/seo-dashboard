"use client"

import { Fragment } from "react"
import type { ReactNode } from "react"

export interface Column {
  key: string
  header: string
  className?: string
  render?: (row: Record<string, unknown>) => ReactNode
}

interface DataTableProps {
  columns: Column[]
  rows: Record<string, unknown>[]
  loading?: boolean
  keyField: string
  onRowClick?: (row: Record<string, unknown>) => void
  selectedKeys?: Set<unknown>
  renderExpanded?: (row: Record<string, unknown>) => ReactNode
}

export function DataTable({
  columns, rows, loading, keyField,
  onRowClick, selectedKeys, renderExpanded,
}: DataTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        No data — select a property and date range
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-left ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => {
            const key = String(row[keyField] ?? idx)
            const isSelected = selectedKeys?.has(row[keyField]) ?? false
            return (
              <Fragment key={key}>
                <tr
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    onRowClick ? "cursor-pointer" : "",
                    isSelected ? "bg-blue-50 border-l-2 border-l-blue-400" : "hover:bg-gray-50",
                  ].join(" ")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-gray-700 ${col.className ?? ""}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
                {isSelected && renderExpanded && (
                  <tr className="bg-white">
                    <td colSpan={columns.length} className="p-0">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
