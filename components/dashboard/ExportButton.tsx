"use client"

import { Button } from "@/components/ui/Button"
import * as XLSX from "xlsx"
import { log } from "@/lib/audit-log"

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename?: string
  disabled?: boolean
}

export function ExportButton({
  data,
  filename = "export",
  disabled,
}: ExportButtonProps) {
  function handleExport() {
    if (!data.length) return

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      ↓ Export Excel
    </Button>
  )
}
