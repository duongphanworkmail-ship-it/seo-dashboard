import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { log } from "@/lib/audit-log"

export const DELETE = withAuth(
  async ({ session, req }) => {
    const id = req.nextUrl.pathname.split("/").at(-1)!

    const property = await prisma.property.findUnique({ where: { id } })
    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.property.delete({ where: { id } })

    await log({
      userId: session.user.id,
      action: "PROPERTY_DELETED",
      targetId: id,
      metadata: { name: property.name },
    })

    return NextResponse.json({ success: true })
  },
  { requiredRole: "ADMIN" }
)
