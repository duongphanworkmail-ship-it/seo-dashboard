import { prisma } from "@/lib/prisma"
import type { AuditAction } from "@/app/generated/prisma/enums"

interface LogParams {
  userId?: string | null
  action: AuditAction
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
}

export async function log(params: LogParams) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.auditLog.create({
      data: { ...params, userId: params.userId ?? undefined } as any,
    })
  } catch {
    console.error("[AuditLog] Failed to write:", params)
  }
}
