"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { FilterBar, type Filters } from "@/components/dashboard/FilterBar"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { DataTable, type Column } from "@/components/dashboard/DataTable"
import { DimensionTabs, type DimensionOption } from "@/components/dashboard/DimensionTabs"
import { QuerySearchBar } from "@/components/dashboard/QuerySearchBar"
import { GscDetailPanel } from "@/components/dashboard/GscDetailPanel"
import { GscTrendChart } from "@/components/dashboard/GscTrendChart"
import { CompareBar } from "@/components/dashboard/CompareBar"
import { Pagination } from "@/components/dashboard/Pagination"
import { ExportButton } from "@/components/dashboard/ExportButton"
import { Card } from "@/components/ui/Card"
import { defaultComparison, computeComparisonDates, calcDelta, type ComparisonState } from "@/lib/comparison"

interface Property { id: string; name: string; type: string }
interface GscSummary { clicks: number; impressions: number; ctr: number; position: number }

function toIso(d: Date) { return d.toISOString().split("T")[0] }
const defaultEnd   = toIso(new Date())
const defaultStart = toIso(new Date(Date.now() - 28 * 86400_000))

const DIMENSIONS: DimensionOption[] = [
  { value: "query",   label: "Queries" },
  { value: "page",    label: "Pages" },
  { value: "country", label: "Countries" },
  { value: "device",  label: "Devices" },
  { value: "date",    label: "Dates" },
]

const DIM_LABELS: Record<string, string> = {
  query: "Query", page: "Page", country: "Country", device: "Device", date: "Date",
}

const DIM_SEARCH_LABELS: Record<string, string> = {
  query: "queries", page: "pages by URL", country: "countries", device: "devices", date: "dates",
}

const LIMIT_OPTIONS = [5, 10, 20] as const

function buildColumns(dim: string, clickable: boolean): Column[] {
  return [
    {
      key: dim,
      header: DIM_LABELS[dim] ?? dim,
      className: "max-w-xs truncate font-medium" + (clickable ? " text-blue-700" : " text-gray-900"),
    },
    { key: "clicks",      header: "Clicks",      className: "text-right", render: (r) => Number(r.clicks).toLocaleString() },
    { key: "impressions", header: "Impressions",  className: "text-right", render: (r) => Number(r.impressions).toLocaleString() },
    { key: "ctr",         header: "CTR",          className: "text-right", render: (r) => `${Number(r.ctr).toFixed(2)}%` },
    { key: "position",    header: "Position",     className: "text-right", render: (r) => Number(r.position).toFixed(1) },
  ]
}

function LimitSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400 mr-1">Rows:</span>
      {LIMIT_OPTIONS.map((n) => (
        <button key={n} onClick={() => onChange(n)}
          className={`px-2 py-0.5 text-xs rounded border transition-colors ${value === n ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"}`}
        >{n}</button>
      ))}
      <button onClick={() => onChange(500)}
        className={`px-2 py-0.5 text-xs rounded border transition-colors ${value === 500 ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"}`}
      >All</button>
    </div>
  )
}

export default function GscPage() {
  const [properties,      setProperties]      = useState<Property[]>([])
  const [filters,         setFilters]         = useState<Filters>({
    propertyId: "", startDate: defaultStart, endDate: defaultEnd, device: "ALL",
  })
  const [comparison,      setComparison]      = useState<ComparisonState>(defaultComparison)
  const [groupBy,         setGroupBy]         = useState("query")
  const [limit,           setLimit]           = useState(20)
  const [page,            setPage]            = useState(1)
  const [activeQuery,     setActiveQuery]     = useState("")
  const [chartDate,       setChartDate]       = useState<string | null>(null)
  const [selectedValues,  setSelectedValues]  = useState<Set<string>>(new Set())
  const [summary,         setSummary]         = useState<GscSummary | null>(null)
  const [compareSummary,  setCompareSummary]  = useState<GscSummary | null>(null)
  const [rows,            setRows]            = useState<Record<string, unknown>[]>([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const compareDates = useMemo(
    () => computeComparisonDates(filters.startDate, filters.endDate, comparison),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.startDate, filters.endDate, comparison.enabled, comparison.type, comparison.customStart, comparison.customEnd],
  )

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data: Property[]) => {
        const gsc = data.filter((p) => p.type === "GSC")
        setProperties(gsc)
        if (gsc.length > 0) setFilters((f) => ({ ...f, propertyId: gsc[0].id }))
      })
  }, [])

  useEffect(() => { setChartDate(null) }, [filters.startDate, filters.endDate, filters.propertyId])

  // Fetch comparison summary separately so it doesn't cause main table refetch
  useEffect(() => {
    if (!compareDates || !filters.propertyId) { setCompareSummary(null); return }
    const q = new URLSearchParams({
      propertyId: filters.propertyId,
      startDate:  compareDates.start,
      endDate:    compareDates.end,
      device:     filters.device,
    })
    fetch(`/api/gsc/summary?${q}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setCompareSummary(d))
      .catch(() => setCompareSummary(null))
  }, [filters.propertyId, filters.device, compareDates])

  const fetchData = useCallback(async () => {
    if (!filters.propertyId) return
    setLoading(true)
    setError(null)
    try {
      const effectiveStart = (chartDate && groupBy !== "date") ? chartDate : filters.startDate
      const effectiveEnd   = (chartDate && groupBy !== "date") ? chartDate : filters.endDate
      const q = new URLSearchParams({
        propertyId: filters.propertyId,
        startDate:  effectiveStart,
        endDate:    effectiveEnd,
        device:     filters.device,
        groupBy,
        limit:      String(limit),
        page:       String(page),
      })
      if (activeQuery) { q.set("searchQuery", activeQuery); q.set("searchDimension", groupBy) }

      const [sumRes, queriesRes] = await Promise.all([
        fetch(`/api/gsc/summary?${q}`),
        fetch(`/api/gsc/queries?${q}`),
      ])

      if (!sumRes.ok || !queriesRes.ok) {
        const err = await (sumRes.ok ? queriesRes : sumRes).json()
        setError(err.error ?? "Failed to load data")
        return
      }

      const [sum, queries] = await Promise.all([sumRes.json(), queriesRes.json()])
      setSummary(sum)
      setRows(queries.rows ?? [])
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [filters, groupBy, limit, page, activeQuery, chartDate])

  useEffect(() => {
    if (filters.propertyId) fetchData()
  }, [filters.propertyId, groupBy, limit, page, activeQuery, chartDate, fetchData])

  const isClickable = groupBy === "query" || groupBy === "page"
  const hasMore     = rows.length === limit && limit < 500

  function handleRowClick(row: Record<string, unknown>) {
    const val = String(row[groupBy] ?? "")
    setSelectedValues((prev) => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }
  function handleGroupByChange(v: string) {
    setGroupBy(v); setPage(1); setSelectedValues(new Set()); setActiveQuery("")
  }
  function fmtBadge(d: string) {
    const [, m, day] = d.split("-"); return `${day}/${m}`
  }

  const tableTitle = DIMENSIONS.find((d) => d.value === groupBy)?.label ?? "Data"

  return (
    <div className="space-y-5">
      <FilterBar
        filters={filters} properties={properties}
        onChange={(f) => { setFilters(f); setPage(1) }}
        onRefresh={() => { setPage(1); fetchData() }}
        loading={loading}
      />

      <CompareBar
        startDate={filters.startDate} endDate={filters.endDate}
        value={comparison} onChange={setComparison}
      />

      <QuerySearchBar
        activeQuery={activeQuery}
        dimLabel={DIM_SEARCH_LABELS[groupBy] ?? groupBy}
        onSearch={(q) => { setActiveQuery(q); setPage(1); setSelectedValues(new Set()) }}
        onClear={() => { setActiveQuery(""); setPage(1); setSelectedValues(new Set()) }}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Clicks"
          value={summary ? summary.clicks.toLocaleString() : "—"}
          trend={summary && compareSummary ? calcDelta(summary.clicks, compareSummary.clicks) : undefined}
          comparisonValue={compareSummary ? compareSummary.clicks.toLocaleString() : undefined}
          sub="GSC" loading={loading} />
        <KpiCard label="Impressions"
          value={summary ? summary.impressions.toLocaleString() : "—"}
          trend={summary && compareSummary ? calcDelta(summary.impressions, compareSummary.impressions) : undefined}
          comparisonValue={compareSummary ? compareSummary.impressions.toLocaleString() : undefined}
          sub="GSC" loading={loading} />
        <KpiCard label="Avg CTR"
          value={summary ? `${summary.ctr}%` : "—"}
          trend={summary && compareSummary ? calcDelta(summary.ctr, compareSummary.ctr) : undefined}
          comparisonValue={compareSummary ? `${compareSummary.ctr}%` : undefined}
          sub="GSC" loading={loading} />
        <KpiCard label="Avg Position"
          value={summary ? summary.position.toFixed(1) : "—"}
          trend={summary && compareSummary ? calcDelta(summary.position, compareSummary.position) : undefined}
          trendInverted
          comparisonValue={compareSummary ? compareSummary.position.toFixed(1) : undefined}
          sub="GSC" loading={loading} />
      </div>

      <GscTrendChart
        propertyId={filters.propertyId}
        startDate={filters.startDate} endDate={filters.endDate} device={filters.device}
        selectedDate={chartDate}
        onDateSelect={(d) => { setChartDate(d); setPage(1); setSelectedValues(new Set()) }}
        compareStart={compareDates?.start} compareEnd={compareDates?.end}
      />

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-700">Top {tableTitle}</h3>
            {chartDate && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full">
                Date: {fmtBadge(chartDate)}
                <button onClick={() => setChartDate(null)} className="hover:text-amber-900 font-bold leading-none">×</button>
              </span>
            )}
            <DimensionTabs options={DIMENSIONS} value={groupBy} onChange={handleGroupByChange} />
          </div>
          <div className="flex items-center gap-3">
            <LimitSelector value={limit} onChange={(n) => { setLimit(n); setPage(1); setSelectedValues(new Set()) }} />
            <ExportButton data={rows} filename={`gsc-${groupBy}`} disabled={loading} />
          </div>
        </div>

        <DataTable
          columns={buildColumns(groupBy, isClickable)} rows={rows} loading={loading}
          keyField={groupBy}
          onRowClick={isClickable ? handleRowClick : undefined}
          selectedKeys={isClickable ? selectedValues : undefined}
          renderExpanded={isClickable ? (row) => {
            const val = String(row[groupBy] ?? "")
            return (
              <GscDetailPanel
                propertyId={filters.propertyId}
                startDate={filters.startDate} endDate={filters.endDate} device={filters.device}
                filterDimension={groupBy as "query" | "page"}
                filterValue={val}
                onClose={() => setSelectedValues((prev) => {
                  const next = new Set(prev); next.delete(val); return next
                })}
              />
            )
          } : undefined}
        />

        <Pagination
          page={page} limit={limit} hasMore={hasMore}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </Card>
    </div>
  )
}
