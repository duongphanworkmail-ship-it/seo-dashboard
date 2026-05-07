"use client"

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 overflow-y-auto p-6">{children}</main>
}
