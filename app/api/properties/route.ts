import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { createPropertySchema } from "@/lib/validators"
import { log } from "@/lib/audit-log"
import { z } from "zod"

export const GET = withAuth(async ({ session }) => {
  const isAdmin = session.user.role === "ADMIN"

  const properties = isAdmin
    ? await prisma.property.findMany({ orderBy: { createdAt: "desc" } })
    : await prisma.property.findMany({
        where: {
          permissions: { some: { userId: session.user.id } },
        },
        orderBy: { createdAt: "desc" },
      })

  return NextResponse.json(properties)
})

export const POST = withAuth(
  async ({ session, req }) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const result = createPropertySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const existing = await prisma.property.findUnique({
      where: { externalId: result.data.externalId },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Property with this ID already exists" },
        { status: 409 }
      )
    }

    const property = await prisma.property.create({ data: result.data })

    await log({
      userId: session.user.id,
      action: "PROPERTY_CREATED",
      targetId: property.id,
      metadata: { name: property.name, type: property.type },
    })

    return NextResponse.json(property, { status: 201 })
  },
  { requiredRole: "ADMIN" }
)
