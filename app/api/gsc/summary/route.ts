import { NextRequest, NextResponse } from "next/server"
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

  const { propertyId, startDate, endDate, device, country, searchQuery, searchDimension, filterDimension, filterValue } = result.data

  const hasAccess =
    session.user.role === "ADMIN" ||
    (await prisma.permission.findUnique({
      where: {
        userId_propertyId: { userId: session.user.id, propertyId },
      },
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

  try {
    const auth = await getGoogleAuthClient(session.user.id)
    const searchconsole = google.searchconsole({ version: "v1", auth })

    const dimensions: string[] = []
    if (device !== "ALL") dimensions.push("device")
    if (country) dimensions.push("country")

    const filters: object[] = []
    if (device !== "ALL") {
      filters.push({
        dimension: "device",
        operator: "equals",
        expression: device.toLowerCase(),
      })
    }
    if (country) {
      filters.push({
        dimension: "country",
        operator: "equals",
        expression: country.toUpperCase(),
      })
    }
    if (searchQuery) {
      const sDim = searchDimension ?? "query"
      filters.push({ dimension: sDim, operator: "contains", expression: searchQuery })
    }
    if (filterDimension && filterValue) {
      filters.push({ dimension: filterDimension, operator: "equals", expression: filterValue })
    }

    const response = await searchconsole.searchanalytics.query({
      siteUrl: property.externalId,
      requestBody: {
        startDate,
        endDate,
        dimensions: dimensions.length > 0 ? dimensions : undefined,
        dimensionFilterGroups:
          filters.length > 0
            ? [{ filters }]
            : undefined,
        rowLimit: 1,
        aggregationType: "auto",
      },
    })

    const row = response.data.rows?.[0] ?? null
    return NextResponse.json({
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      ctr: row ? Math.round((row.ctr ?? 0) * 10000) / 100 : 0,
      position: row ? Math.round((row.position ?? 0) * 10) / 10 : 0,
    })
  } catch (err: unknown) {
    console.error("[GSC summary error]", err)
    const e = err as Record<string, unknown>
    const message = typeof e?.message === "string" ? e.message : "Google API error"
    const code = e?.code ?? e?.status ?? null
    return NextResponse.json({ error: message, code }, { status: 502 })
  }
})
