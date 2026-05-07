export interface ComparisonState {
  enabled: boolean
  type: "previous" | "year" | "custom"
  customStart: string
  customEnd: string
}

export const defaultComparison: ComparisonState = {
  enabled: false,
  type: "previous",
  customStart: "",
  customEnd: "",
}

function toIso(d: Date) { return d.toISOString().split("T")[0] }

export function computeComparisonDates(
  startDate: string,
  endDate: string,
  state: ComparisonState,
): { start: string; end: string } | null {
  if (!state.enabled) return null

  if (state.type === "custom") {
    if (!state.customStart || !state.customEnd) return null
    return { start: state.customStart, end: state.customEnd }
  }

  const start = new Date(startDate)
  const end   = new Date(endDate)
  const days  = Math.round((end.getTime() - start.getTime()) / 86400_000) + 1

  if (state.type === "year") {
    const cStart = new Date(start); cStart.setFullYear(cStart.getFullYear() - 1)
    const cEnd   = new Date(end);   cEnd.setFullYear(cEnd.getFullYear() - 1)
    return { start: toIso(cStart), end: toIso(cEnd) }
  }

  // previous period: same length, ending day before current start
  const cEnd   = new Date(start); cEnd.setDate(cEnd.getDate() - 1)
  const cStart = new Date(cEnd);  cStart.setDate(cStart.getDate() - days + 1)
  return { start: toIso(cStart), end: toIso(cEnd) }
}

export function calcDelta(current: number, prev: number): number | undefined {
  if (!prev) return undefined
  return Math.round(((current - prev) / Math.abs(prev)) * 1000) / 10
}
