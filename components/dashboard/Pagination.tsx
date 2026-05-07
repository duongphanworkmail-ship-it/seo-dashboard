"use client"

interface PaginationProps {
  page: number
  limit: number
  rowCount?: number
  hasMore?: boolean
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, limit, rowCount, hasMore, onPrev, onNext }: PaginationProps) {
  const totalPages = rowCount != null ? Math.ceil(rowCount / limit) : null
  const canNext = rowCount != null ? page < (totalPages ?? 1) : (hasMore ?? false)
  const canPrev = page > 1

  if (!canPrev && !canNext) return null

  const from = ((page - 1) * limit + 1).toLocaleString()
  const to = rowCount != null
    ? Math.min(page * limit, rowCount).toLocaleString()
    : (page * limit).toLocaleString()

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs">
      <span className="text-gray-500">
        {rowCount != null
          ? `${from}–${to} of ${rowCount.toLocaleString()} rows`
          : `Page ${page}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white hover:border-gray-400 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-gray-600 px-1 font-medium">
          {totalPages ? `${page} / ${totalPages}` : `Page ${page}`}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-white hover:border-gray-400 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
