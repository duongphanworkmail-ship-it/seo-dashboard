"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

const roleBadge: Record<string, "blue" | "green" | "gray"> = {
  ADMIN: "blue",
  EDITOR: "green",
  VIEWER: "gray",
}

export function Header({ title }: { title: string }) {
  const { data: session } = useSession()

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {session?.user.role && (
          <Badge variant={roleBadge[session.user.role] ?? "gray"}>
            {session.user.role}
          </Badge>
        )}
        <span className="text-sm text-gray-600 hidden sm:block">
          {session?.user.name ?? session?.user.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
