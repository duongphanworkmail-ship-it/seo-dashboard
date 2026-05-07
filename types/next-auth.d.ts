import type { Role } from "@/app/generated/prisma/enums"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      email: string
      name?: string | null
      image?: string | null
    }
  }
  interface User {
    role: Role
  }
}
