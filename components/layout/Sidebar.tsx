"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { twMerge } from "tailwind-merge"
import { useSession } from "next-auth/react"

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "⊞" },
  { href: "/dashboard/gsc", label: "Search Console", icon: "🔍" },
  { href: "/dashboard/ga4", label: "Analytics", icon: "📊" },
]

const adminItems = [
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/properties", label: "Properties", icon: "🏠" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user.role === "ADMIN"

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-base font-bold text-gray-900">SEO Dashboard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={twMerge(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Admin
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={twMerge(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-5 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 truncate">
          {session?.user.email}
        </p>
      </div>
    </aside>
  )
}
