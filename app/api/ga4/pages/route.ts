import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { getGoogleAuthClient } from "@/lib/google-auth"
import { propertyQuerySchema } from "@/lib/validators"
import { google } from "googleapis"

const VALID_DIMS = [
  "pagePath",
  "pageTitle",
  "sessionSource",
  "country",
  "deviceCategory",
  "sessionDefaultChannelGroup",
  "date",
]

export const GET = withAuth(async ({ session, req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const result = propertyQuerySchema.safeParse(params)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { propertyId, startDate, endDate, device, country, page, limit, groupBy, filterDimension, filterValue } =
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
    where: { id: propertyId, type: "GA4" },
  })
  if (!property) {
    return NextResponse.json({ error: "GA4 property not found" }, { status: 404 })
  }

  const dim = groupBy && VALID_DIMS.includes(groupBy) ? groupBy : "pagePath"

  try {
    const auth = await getGoogleAuthClient(session.user.id)
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth })

    const dimensionFilters: object[] = []
    if (device !== "ALL" && dim !== "deviceCategory") {
      dimensionFilters.push({
        filter: {
          fieldName: "deviceCategory",
          stringFilter: { matchType: "EXACT", value: device.toLowerCase() },
        },
      })
    }
    if (country && dim !== "country") {
      dimensionFilters.push({
        filter: {
          fieldName: "country",
          stringFilter: { matchType: "EXACT", value: country },
        },
      })
    }
    if (filterDimension && filterValue && filterDimension !== dim) {
      dimensionFilters.push({
        filter: {
          fieldName: filterDimension,
          stringFilter: { matchType: "EXACT", value: filterValue },
        },
      })
    }

    const response = await analyticsdata.properties.runReport({
      property: `properties/${property.externalId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: dim }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
        dimensionFilter:
          dimensionFilters.length > 0
            ? { andGroup: { expressions: dimensionFilters } }
            : undefined,
        orderBys: dim === "date"
          ? [{ dimension: { dimensionName: "date" }, desc: false }]
          : [{ metric: { metricName: "sessions" }, desc: true }],
        limit: String(limit),
        offset: String((page - 1) * limit),
      },
    })

    const rows = (response.data.rows ?? []).map((r) => ({
      [dim]: r.dimensionValues?.[0]?.value ?? "",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
      users: parseInt(r.metricValues?.[1]?.value ?? "0"),
      pageviews: parseInt(r.metricValues?.[2]?.value ?? "0"),
      bounceRate:
        Math.round(parseFloat(r.metricValues?.[3]?.value ?? "0") * 10000) / 100,
    }))

    return NextResponse.json({
      rows,
      dimension: dim,
      rowCount: response.data.rowCount ?? 0,
    })
  } catch (err: unknown) {
    console.error("[GA4 pages error]", err)
    const e = err as Record<string, unknown>
    const message = typeof e?.message === "string" ? e.message : "Google API error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
})
