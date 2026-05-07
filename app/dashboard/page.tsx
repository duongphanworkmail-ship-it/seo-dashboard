import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card } from "@/components/ui/Card"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  const properties = isAdmin
    ? await prisma.property.findMany({ orderBy: { createdAt: "desc" } })
    : await prisma.property.findMany({
        where: { permissions: { some: { userId: session.user.id } } },
        orderBy: { createdAt: "desc" },
      })

  const gscProps = properties.filter((p) => p.type === "GSC")
  const ga4Props = properties.filter((p) => p.type === "GA4")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Welcome, {session.user.name?.split(" ")[0] ?? "there"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          You have access to {properties.length} propert{properties.length !== 1 ? "ies" : "y"}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-medium text-gray-500 mb-1">GSC Properties</div>
          <div className="text-3xl font-bold text-gray-900">{gscProps.length}</div>
        </Card>
        <Card>
          <div className="text-sm font-medium text-gray-500 mb-1">GA4 Properties</div>
          <div className="text-3xl font-bold text-gray-900">{ga4Props.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/gsc"
          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">🔍</div>
          <div className="font-semibold text-gray-900">Search Console</div>
          <div className="text-sm text-gray-500 mt-1">
            Clicks, impressions, CTR, position by query and page
          </div>
        </Link>
        <Link
          href="/dashboard/ga4"
          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold text-gray-900">Analytics</div>
          <div className="text-sm text-gray-500 mt-1">
            Sessions, users, pageviews, bounce rate
          </div>
        </Link>
      </div>

      {properties.length === 0 && (
        <Card className="text-center py-10">
          <p className="text-gray-500 text-sm">
            No properties added yet.{" "}
            {isAdmin ? (
              <Link href="/admin/properties" className="text-blue-600 hover:underline">
                Add a property →
              </Link>
            ) : (
              "Contact your admin to get access."
            )}
          </p>
        </Card>
      )}
    </div>
  )
}
