"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"

interface User {
  id: string
  email: string
  name: string | null
}

interface Property {
  id: string
  name: string
  type: string
}

interface PropertyPermissionFormProps {
  users: User[]
  properties: Property[]
  onGranted: () => void
}

export function PropertyPermissionForm({
  users,
  properties,
  onGranted,
}: PropertyPermissionFormProps) {
  const [userId, setUserId] = useState("")
  const [propertyId, setPropertyId] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleGrant() {
    if (!userId || !propertyId) return
    setLoading(true)
    setMessage(null)
    const res = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, propertyId }),
    })
    setLoading(false)
    if (res.ok) {
      setMessage({ type: "ok", text: "Permission granted" })
      onGranted()
    } else {
      const data = await res.json()
      setMessage({ type: "err", text: data.error ?? "Failed" })
    }
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Grant Property Access</h3>
      <div className="flex flex-wrap gap-3">
        <Select
          label="User"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="min-w-[200px]"
        >
          <option value="">Select user…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </Select>
        <Select
          label="Property"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="min-w-[200px]"
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type})
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button
            onClick={handleGrant}
            disabled={!userId || !propertyId || loading}
          >
            {loading ? "Granting…" : "Grant Access"}
          </Button>
        </div>
      </div>
      {message && (
        <p
          className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
