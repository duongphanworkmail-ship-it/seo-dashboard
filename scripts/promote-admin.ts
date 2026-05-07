import "dotenv/config"
import { prisma } from "../lib/prisma"

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: npx tsx scripts/promote-admin.ts <email>")
    process.exit(1)
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  })

  console.log(`Promoted ${user.email} to ADMIN`)
}

main().catch(console.error).finally(() => process.exit(0))
