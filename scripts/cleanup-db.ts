import "dotenv/config"
import { prisma } from "../lib/prisma"

async function main() {
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  console.log("Database cleaned successfully")
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
