"use client"

import { useState } from "react"
import { RoleSelect } from "@/components/admin/RoleSelect"
import { Badge } from "@/components/ui/Badge"

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  createdAt: string
  permissions: { propertyId: string }[]
}

interface UserTableProps {
  users: User[]
  currentUserId: string
}

export function UserTable({ users: initial, currentUserId }: UserTableProps) {
  const [users, setUsers] = useState(initial)

  function handleRoleChange(userId: string, role: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Properties</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-gray-900">{user.name ?? "—"}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </td>
              <td className="px-4 py-3">
                {user.id === currentUserId ? (
                  <Badge variant="blue">{user.role}</Badge>
                ) : (
                  <RoleSelect
                    userId={user.id}
                    currentRole={user.role}
                    onChanged={handleRoleChange}
                  />
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {user.permissions.length}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
