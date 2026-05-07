"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { PropertyPermissionForm } from "@/components/admin/PropertyPermissionForm"

interface Property {
  id: string
  name: string
  type: string
  externalId: string
  createdAt: string
}

interface User {
  id: string
  email: string
  name: string | null
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newProp, setNewProp] = useState({ name: "", type: "GSC", externalId: "" })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    const [propsRes, usersRes] = await Promise.all([
      fetch("/api/properties"),
      fetch("/api/admin/users"),
    ])
    if (propsRes.ok) setProperties(await propsRes.json())
    if (usersRes.ok) setUsers(await usersRes.json())
  }

  useEffect(() => { loadData() }, [])

  async function handleAdd() {
    if (!newProp.name || !newProp.externalId) return
    setAdding(true)
    setError(null)
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProp),
    })
    setAdding(false)
    if (res.ok) {
      setNewProp({ name: "", type: "GSC", externalId: "" })
      setShowForm(false)
      loadData()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed to add property")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch(`/api/properties/${id}`, { method: "DELETE" })
    loadData()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Properties ({properties.length})</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Property"}
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Property</h3>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Display name"
              value={newProp.name}
              onChange={(e) => setNewProp((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[160px]"
            />
            <select
              value={newProp.type}
              onChange={(e) => setNewProp((p) => ({ ...p, type: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="GSC">GSC</option>
              <option value="GA4">GA4</option>
            </select>
            <input
              placeholder={newProp.type === "GSC" ? "sc-domain:example.com" : "123456789"}
              value={newProp.externalId}
              onChange={(e) => setNewProp((p) => ({ ...p, externalId: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1 min-w-[200px]"
            />
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? "Adding…" : "Save"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <PropertyPermissionForm
        users={users}
        properties={properties}
        onGranted={loadData}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">External ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No properties added yet
                </td>
              </tr>
            ) : (
              properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.type === "GSC" ? "blue" : "green"}>{p.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.externalId}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
