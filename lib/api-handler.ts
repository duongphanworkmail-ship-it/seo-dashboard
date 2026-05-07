import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { hasRole } from "@/lib/rbac"
import { NextRequest, NextResponse } from "next/server"
import type { Role } from "@/app/generated/prisma/enums"
import type { Session } from "next-auth"

type HandlerContext = {
  session: Session
  req: NextRequest
}

type Handler = (ctx: HandlerContext) => Promise<NextResponse>

export function withAuth(
  handler: Handler,
  options: { requiredRole?: Role } = {}
) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (
      options.requiredRole &&
      !hasRole(session.user.role, options.requiredRole)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rateLimitError = checkRateLimit(session.user.id)
    if (rateLimitError) return rateLimitError

    return handler({ session, req })
  }
}
