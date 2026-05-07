import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (session.user.role !== "ADMIN") redirect("/dashboard")
  return session
}
