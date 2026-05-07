"use client"

import { useState } from "react"
import { Select } from "@/components/ui/Select"

interface RoleSelectProps {
  userId: string
  currentRole: string
  onChanged: (userId: string, role: string) => void
}

export function RoleSelect({ userId, currentRole, onChanged }: RoleSelectProps) {
  const [loading, setLoading] = useState(false)

  async function handleChange(role: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) onChanged(userId, role)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Select
      value={currentRole}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="text-xs"
    >
      <option value="VIEWER">Viewer</option>
      <option value="EDITOR">Editor</option>
      <option value="ADMIN">Admin</option>
    </Select>
  )
}
