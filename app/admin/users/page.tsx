import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserTable } from "@/components/admin/UserTable"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      permissions: { select: { propertyId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Users ({users.length})</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <UserTable users={users as never} currentUserId={session!.user.id} />
      </div>
    </div>
  )
}
