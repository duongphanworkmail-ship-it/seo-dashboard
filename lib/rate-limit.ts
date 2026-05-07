import { LRUCache } from "lru-cache"
import { NextResponse } from "next/server"

const rateLimit = new LRUCache<string, number[]>({
  max: 500,
  ttl: 60_000,
})

export function checkRateLimit(
  identifier: string,
  limit = 30
): NextResponse | null {
  const now = Date.now()
  const hits = rateLimit.get(identifier) ?? []
  const recent = hits.filter((t) => now - t < 60_000)

  if (recent.length >= limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  rateLimit.set(identifier, [...recent, now])
  return null
}
