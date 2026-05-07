import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { getGoogleAuthClient } from "@/lib/google-auth"
import { propertyQuerySchema } from "@/lib/validators"
import { google } from "googleapis"

const VALID_DIMS = ["query", "page", "country", "device", "date", "searchAppearance"]

export const GET = withAuth(async ({ session, req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const result = propertyQuerySchema.safeParse(params)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { propertyId, startDate, endDate, device, country, page, limit, groupBy, searchQuery, searchDimension, filterDimension, filterValue } =
    result.data

  const hasAccess =
    session.user.role === "ADMIN" ||
    (await prisma.permission.findUnique({
      where: { userId_propertyId: { userId: session.user.id, propertyId } },
    })) !== null

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId, type: "GSC" },
  })
  if (!property) {
    return NextResponse.json({ error: "GSC property not found" }, { status: 404 })
  }

  const dim = groupBy && VALID_DIMS.includes(groupBy) ? groupBy : "query"

  try {
    const auth = await getGoogleAuthClient(session.user.id)
    const searchconsole = google.searchconsole({ version: "v1", auth })

    const filters: object[] = []
    if (device !== "ALL" && dim !== "device") {
      filters.push({ dimension: "device", operator: "equals", expression: device.toLowerCase() })
    }
    if (country && dim !== "country") {
      filters.push({ dimension: "country", operator: "equals", expression: country.toUpperCase() })
    }
    if (searchQuery) {
      const sDim = searchDimension ?? dim
      filters.push({ dimension: sDim, operator: "contains", expression: searchQuery })
    }
    if (filterDimension && filterValue && filterDimension !== dim) {
      filters.push({ dimension: filterDimension, operator: "equals", expression: filterValue })
    }

    const response = await searchconsole.searchanalytics.query({
      siteUrl: property.externalId,
      requestBody: {
        startDate,
        endDate,
        dimensions: [dim],
        dimensionFilterGroups: filters.length > 0 ? [{ filters }] : undefined,
        rowLimit: limit,
        startRow: (page - 1) * limit,
      },
    })

    const rows = (response.data.rows ?? []).map((r) => ({
      [dim]: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: Math.round((r.ctr ?? 0) * 10000) / 100,
      position: Math.round((r.position ?? 0) * 10) / 10,
    }))

    return NextResponse.json({
      rows,
      dimension: dim,
      total: response.data.responseAggregationType ?? null,
    })
  } catch (err: unknown) {
    console.error("[GSC queries error]", err)
    const e = err as Record<string, unknown>
    const message = typeof e?.message === "string" ? e.message : "Google API error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
})
