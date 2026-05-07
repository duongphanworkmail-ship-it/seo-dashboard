import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { requireSession } from "@/lib/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSession()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title="SEO Dashboard" />
        <PageWrapper>{children}</PageWrapper>
      </div>
    </div>
  )
}
