import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { getGoogleAuthClient } from "@/lib/google-auth"
import { propertyQuerySchema } from "@/lib/validators"
import { google } from "googleapis"

export const GET = withAuth(async ({ session, req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams)
  const result = propertyQuerySchema.safeParse(params)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { propertyId, startDate, endDate, device, country, filterDimension, filterValue } = result.data

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

  try {
    const auth = await getGoogleAuthClient(session.user.id)
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth })

    const dimensionFilters: object[] = []
    if (device !== "ALL") {
      dimensionFilters.push({
        filter: {
          fieldName: "deviceCategory",
          stringFilter: { matchType: "EXACT", value: device.toLowerCase() },
        },
      })
    }
    if (country) {
      dimensionFilters.push({
        filter: {
          fieldName: "country",
          stringFilter: { matchType: "EXACT", value: country },
        },
      })
    }
    if (filterDimension && filterValue) {
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
      },
    })

    const row = response.data.rows?.[0]?.metricValues ?? []
    return NextResponse.json({
      sessions: parseInt(row[0]?.value ?? "0"),
      users: parseInt(row[1]?.value ?? "0"),
      pageviews: parseInt(row[2]?.value ?? "0"),
      bounceRate: Math.round(parseFloat(row[3]?.value ?? "0") * 10000) / 100,
    })
  } catch (err: unknown) {
    console.error("[GA4 summary error]", err)
    const e = err as Record<string, unknown>
    const message = typeof e?.message === "string" ? e.message : "Google API error"
    return NextResponse.json({ error: message }, { status: 502 })
  }
})
