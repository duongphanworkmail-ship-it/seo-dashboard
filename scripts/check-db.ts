import "dotenv/config"
import { prisma } from "../lib/prisma"

async function main() {
  const users = await prisma.user.findMany()
  const sessions = await prisma.session.findMany()
  const accounts = await prisma.account.findMany({
    select: { userId: true, provider: true, providerAccountId: true, access_token: true },
  })
  console.log("=== USERS ===", JSON.stringify(users, null, 2))
  console.log("=== SESSIONS ===", JSON.stringify(sessions, null, 2))
  console.log("=== ACCOUNTS ===", JSON.stringify(accounts, null, 2))
}

main().catch(console.error).finally(() => process.exit(0))
