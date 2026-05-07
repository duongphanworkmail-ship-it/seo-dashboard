import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { updateRoleSchema } from "@/lib/validators"
import { log } from "@/lib/audit-log"

export const PATCH = withAuth(
  async ({ session, req }) => {
    const targetId = req.nextUrl.pathname.split("/").at(-1)!

    if (targetId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const result = updateRoleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: result.data.role },
    })

    await log({
      userId: session.user.id,
      action: "ROLE_CHANGED",
      targetId,
      metadata: { from: target.role, to: result.data.role },
    })

    return NextResponse.json({ id: updated.id, role: updated.role })
  },
  { requiredRole: "ADMIN" }
)
