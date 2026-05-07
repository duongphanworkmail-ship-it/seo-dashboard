"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"

interface QuerySearchBarProps {
  activeQuery: string
  dimLabel?: string
  onSearch: (q: string) => void
  onClear: () => void
}

export function QuerySearchBar({ activeQuery, dimLabel = "queries", onSearch, onClear }: QuerySearchBarProps) {
  const [input, setInput] = useState(activeQuery)

  useEffect(() => {
    if (!activeQuery) setInput("")
  }, [activeQuery])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) onSearch(input.trim())
  }

  function handleClear() {
    setInput("")
    onClear()
  }

  return (
    <div className="flex items-center gap-2 p-4 bg-white rounded-xl border border-gray-200">
      <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
        Filter {dimLabel}:
      </label>
      <input
        type="text"
        placeholder={`Type and press Enter to filter ${dimLabel}…`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Button onClick={() => input.trim() && onSearch(input.trim())} disabled={!input.trim()}>
        Search
      </Button>
      {activeQuery && (
        <>
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
            &quot;{activeQuery}&quot;
          </span>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </>
      )}
    </div>
  )
}
