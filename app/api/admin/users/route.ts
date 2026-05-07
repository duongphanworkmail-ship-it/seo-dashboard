import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

export const GET = withAuth(
  async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        permissions: {
          select: { propertyId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users)
  },
  { requiredRole: "ADMIN" }
)
