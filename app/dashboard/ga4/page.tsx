"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { FilterBar, type Filters } from "@/components/dashboard/FilterBar"
import { KpiCard } from "@/components/dashboard/KpiCard"
import { DataTable, type Column } from "@/components/dashboard/DataTable"
import { DimensionTabs, type DimensionOption } from "@/components/dashboard/DimensionTabs"
import { Ga4DrillPanel } from "@/components/dashboard/Ga4DrillPanel"
import { Ga4TrendChart } from "@/components/dashboard/Ga4TrendChart"
import { CompareBar } from "@/components/dashboard/CompareBar"
import { Pagination } from "@/components/dashboard/Pagination"
import { ExportButton } from "@/components/dashboard/ExportButton"
import { Card } from "@/components/ui/Card"
import { defaultComparison, computeComparisonDates, calcDelta, type ComparisonState } from "@/lib/comparison"

interface Property { id: string; name: string; type: string }
interface Ga4Summary { sessions: number; users: number; pageviews: number; bounceRate: number }

function toIso(d: Date) { return d.toISOString().split("T")[0] }
const defaultEnd   = toIso(new Date())
const defaultStart = toIso(new Date(Date.now() - 28 * 86400_000))

const DIMENSIONS: DimensionOption[] = [
  { value: "pagePath",                   label: "Pages" },
  { value: "pageTitle",                  label: "Page Titles" },
  { value: "sessionSource",              label: "Sources" },
  { value: "country",                    label: "Countries" },
  { value: "deviceCategory",             label: "Devices" },
  { value: "sessionDefaultChannelGroup", label: "Channels" },
]

const DIM_LABELS: Record<string, string> = {
  pagePath: "Page", pageTitle: "Page Title", sessionSource: "Source",
  country: "Country", deviceCategory: "Device", sessionDefaultChannelGroup: "Channel",
}

const LIMIT_OPTIONS = [5, 10, 20] as const

function buildColumns(dim: string): Column[] {
  return [
    { key: dim,          header: DIM_LABELS[dim] ?? dim, className: "max-w-xs truncate font-medium text-blue-700" },
    { key: "sessions",   header: "Sessions",    className: "text-right", render: (r) => Number(r.sessions).toLocaleString() },
    { key: "users",      header: "Users",       className: "text-right", render: (r) => Number(r.users).toLocaleString() },
    { key: "pageviews",  header: "Pageviews",   className: "text-right", render: (r) => Number(r.pageviews).toLocaleString() },
    { key: "bounceRate", header: "Bounce Rate", className: "text-right", render: (r) => `${Number(r.bounceRate).toFixed(2)}%` },
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

export default function Ga4Page() {
  const [properties,     setProperties]     = useState<Property[]>([])
  const [filters,        setFilters]        = useState<Filters>({
    propertyId: "", startDate: defaultStart, endDate: defaultEnd, device: "ALL",
  })
  const [comparison,     setComparison]     = useState<ComparisonState>(defaultComparison)
  const [groupBy,        setGroupBy]        = useState("pagePath")
  const [limit,          setLimit]          = useState(20)
  const [page,           setPage]           = useState(1)
  const [chartDate,      setChartDate]      = useState<string | null>(null)
  const [selectedRows,   setSelectedRows]   = useState<Map<string, Record<string, unknown>>>(new Map())
  const [summary,        setSummary]        = useState<Ga4Summary | null>(null)
  const [compareSummary, setCompareSummary] = useState<Ga4Summary | null>(null)
  const [rows,           setRows]           = useState<Record<string, unknown>[]>([])
  const [rowCount,       setRowCount]       = useState<number | undefined>(undefined)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const compareDates = useMemo(
    () => computeComparisonDates(filters.startDate, filters.endDate, comparison),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.startDate, filters.endDate, comparison.enabled, comparison.type, comparison.customStart, comparison.customEnd],
  )

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data: Property[]) => {
        const ga4 = data.filter((p) => p.type === "GA4")
        setProperties(ga4)
        if (ga4.length > 0) setFilters((f) => ({ ...f, propertyId: ga4[0].id }))
      })
  }, [])

  useEffect(() => { setChartDate(null) }, [filters.startDate, filters.endDate, filters.propertyId])

  useEffect(() => {
    if (!compareDates || !filters.propertyId) { setCompareSummary(null); return }
    const q = new URLSearchParams({
      propertyId: filters.propertyId,
      startDate:  compareDates.start,
      endDate:    compareDates.end,
      device:     filters.device,
    })
    fetch(`/api/ga4/summary?${q}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setCompareSummary(d))
      .catch(() => setCompareSummary(null))
  }, [filters.propertyId, filters.device, compareDates])

  const fetchData = useCallback(async () => {
    if (!filters.propertyId) return
    setLoading(true)
    setError(null)
    try {
      const chartDateIso = chartDate
        ? `${chartDate.slice(0, 4)}-${chartDate.slice(4, 6)}-${chartDate.slice(6, 8)}`
        : null
      const q = new URLSearchParams({
        propertyId: filters.propertyId,
        startDate:  chartDateIso ?? filters.startDate,
        endDate:    chartDateIso ?? filters.endDate,
        device:     filters.device,
        groupBy,
        limit:      String(limit),
        page:       String(page),
      })

      const [sumRes, pagesRes] = await Promise.all([
        fetch(`/api/ga4/summary?${q}`),
        fetch(`/api/ga4/pages?${q}`),
      ])

      if (!sumRes.ok || !pagesRes.ok) {
        const err = await (sumRes.ok ? pagesRes : sumRes).json()
        setError(err.error ?? "Failed to load data")
        return
      }

      const [sum, pages] = await Promise.all([sumRes.json(), pagesRes.json()])
      setSummary(sum)
      setRows(pages.rows ?? [])
      setRowCount(typeof pages.rowCount === "number" ? pages.rowCount : undefined)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [filters, groupBy, limit, page, chartDate])

  useEffect(() => {
    if (filters.propertyId) fetchData()
  }, [filters.propertyId, groupBy, limit, page, chartDate, fetchData])

  function handleRowClick(row: Record<string, unknown>) {
    const key = String(row[groupBy] ?? "")
    setSelectedRows((prev) => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, row)
      return next
    })
  }
  function clearSelection() { setSelectedRows(new Map()) }

  const tableTitle = DIMENSIONS.find((d) => d.value === groupBy)?.label ?? "Data"

  function fmtBadge(d: string) {
    if (d.length === 8) return `${d.slice(6)}/${d.slice(4, 6)}`
    const [, m, day] = d.split("-"); return `${day}/${m}`
  }

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

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Sessions"
          value={summary ? summary.sessions.toLocaleString() : "—"}
          trend={summary && compareSummary ? calcDelta(summary.sessions, compareSummary.sessions) : undefined}
          comparisonValue={compareSummary ? compareSummary.sessions.toLocaleString() : undefined}
          sub="GA4" loading={loading} />
        <KpiCard label="Users"
          value={summary ? summary.users.toLocaleString() : "—"}
          trend={summary && compareSummary ? calcDelta(summary.users, compareSummary.users) : undefined}
          comparisonValue={compareSummary ? compareSummary.users.toLocaleString() : undefined}
          sub="GA4" loading={loading} />
        <KpiCard label="Pageviews"
          value={summary ? summary.pageviews.toLocaleString() : "—"}
          trend={summary && compareSummary ? calcDelta(summary.pageviews, compareSummary.pageviews) : undefined}
          comparisonValue={compareSummary ? compareSummary.pageviews.toLocaleString() : undefined}
          sub="GA4" loading={loading} />
        <KpiCard label="Bounce Rate"
          value={summary ? `${summary.bounceRate}%` : "—"}
          trend={summary && compareSummary ? calcDelta(summary.bounceRate, compareSummary.bounceRate) : undefined}
          trendInverted
          comparisonValue={compareSummary ? `${compareSummary.bounceRate}%` : undefined}
          sub="GA4" loading={loading} />
      </div>

      <Ga4TrendChart
        propertyId={filters.propertyId}
        startDate={filters.startDate} endDate={filters.endDate} device={filters.device}
        selectedDate={chartDate}
        onDateSelect={(d) => { setChartDate(d); setPage(1); clearSelection() }}
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
            <DimensionTabs
              options={DIMENSIONS} value={groupBy}
              onChange={(v) => { setGroupBy(v); setPage(1); clearSelection() }}
            />
          </div>
          <div className="flex items-center gap-3">
            <LimitSelector value={limit} onChange={(n) => { setLimit(n); setPage(1); clearSelection() }} />
            <ExportButton data={rows} filename={`ga4-${groupBy}`} disabled={loading} />
          </div>
        </div>

        {groupBy !== "date" && rows.length > 0 && !loading && (
          <p className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
            Click rows to see breakdown — click again to close
          </p>
        )}

        <DataTable
          columns={buildColumns(groupBy)} rows={rows} loading={loading}
          keyField={groupBy}
          onRowClick={groupBy !== "date" ? handleRowClick : undefined}
          selectedKeys={groupBy !== "date" ? new Set(selectedRows.keys()) : undefined}
          renderExpanded={groupBy !== "date" ? (row) => {
            const key = String(row[groupBy] ?? "")
            return (
              <Ga4DrillPanel
                propertyId={filters.propertyId}
                startDate={filters.startDate} endDate={filters.endDate} device={filters.device}
                sourceDim={groupBy}
                sourceValue={key}
                onClose={() => setSelectedRows((prev) => {
                  const next = new Map(prev); next.delete(key); return next
                })}
              />
            )
          } : undefined}
        />

        <Pagination
          page={page} limit={limit} rowCount={rowCount}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      </Card>
    </div>
  )
}
