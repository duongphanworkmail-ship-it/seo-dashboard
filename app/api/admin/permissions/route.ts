import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { grantPermissionSchema } from "@/lib/validators"
import { log } from "@/lib/audit-log"
import { z } from "zod"

export const POST = withAuth(
  async ({ session, req }) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const result = grantPermissionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { userId, propertyId } = result.data

    const existing = await prisma.permission.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Permission already granted" },
        { status: 409 }
      )
    }

    const permission = await prisma.permission.create({
      data: { userId, propertyId },
    })

    await log({
      userId: session.user.id,
      action: "PERMISSION_GRANTED",
      targetId: userId,
      metadata: { propertyId },
    })

    return NextResponse.json(permission, { status: 201 })
  },
  { requiredRole: "ADMIN" }
)

export const DELETE = withAuth(
  async ({ req }) => {
    const url = new URL(req.url)
    const userId = url.searchParams.get("userId")
    const propertyId = url.searchParams.get("propertyId")

    if (!userId || !propertyId) {
      return NextResponse.json(
        { error: "userId and propertyId required" },
        { status: 400 }
      )
    }

    const existing = await prisma.permission.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    })
    if (!existing) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 })
    }

    await prisma.permission.delete({
      where: { userId_propertyId: { userId, propertyId } },
    })

    await log({
      userId,
      action: "PERMISSION_REVOKED",
      targetId: userId,
      metadata: { propertyId },
    })

    return NextResponse.json({ success: true })
  },
  { requiredRole: "ADMIN" }
)
