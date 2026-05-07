# PLAN.md — SEO Analytics Dashboard

> Full-stack web app aggregating Google Search Console + Google Analytics 4 data.
> Stack: Next.js 14 (App Router) · PostgreSQL (Railway) · Prisma · NextAuth.js · Recharts
> Security-hardened: Zod validation · Rate limiting · Centralized auth middleware · Audit logging

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Codebase Structure](#2-codebase-structure)
3. [Database Design](#3-database-design)
4. [Auth Flow](#4-auth-flow)
5. [API Design](#5-api-design)
6. [RBAC Logic](#6-rbac-logic)
7. [Phase 1 — Project Setup](#phase-1--project-setup)
8. [Phase 2 — Database & Auth](#phase-2--database--auth)
9. [Phase 3 — Security Layer](#phase-3--security-layer)
10. [Phase 4 — Google API Integration](#phase-4--google-api-integration)
11. [Phase 5 — RBAC & Admin](#phase-5--rbac--admin)
12. [Phase 6 — Dashboard UI](#phase-6--dashboard-ui)
13. [Phase 7 — Deployment on Railway](#phase-7--deployment-on-railway)
14. [Definition of Done](#definition-of-done)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| App name | SEO Analytics Dashboard |
| Purpose | Aggregate GSC + GA4 data into a unified, permission-controlled dashboard |
| Deployment | Railway (Next.js app + PostgreSQL in same project) |
| Auth | Google OAuth via NextAuth.js, sessions in PostgreSQL |
| Roles | Admin, Editor, Viewer |
| Security baseline | Zod validation, rate limiting, centralized API auth wrapper, audit log |

---

## 2. Codebase Structure

```
/
├── app/
│   ├── layout.tsx                        # Root layout, SessionProvider
│   ├── page.tsx                          # Redirect → /dashboard or /login
│   ├── login/
│   │   └── page.tsx                      # Google OAuth sign-in page
│   ├── dashboard/
│   │   ├── layout.tsx                    # Dashboard shell (sidebar + header)
│   │   ├── page.tsx                      # Overview: KPIs + combined charts
│   │   ├── gsc/
│   │   │   └── page.tsx                  # GSC detail: queries table + charts
│   │   └── ga4/
│   │       └── page.tsx                  # GA4 detail: pages table + charts
│   ├── admin/
│   │   ├── layout.tsx                    # Admin-only guard (server component)
│   │   ├── users/
│   │   │   └── page.tsx                  # Manage users + roles
│   │   └── properties/
│   │       └── page.tsx                  # Manage properties + grant access
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts              # NextAuth handler
│       ├── gsc/
│       │   ├── summary/route.ts
│       │   └── queries/route.ts
│       ├── ga4/
│       │   ├── summary/route.ts
│       │   └── pages/route.ts
│       ├── properties/
│       │   ├── route.ts                  # GET (user's properties), POST (admin)
│       │   └── [id]/route.ts             # PATCH, DELETE (admin)
│       └── admin/
│           ├── users/
│           │   ├── route.ts              # GET all users
│           │   └── [id]/route.ts         # PATCH role, DELETE
│           └── permissions/
│               └── route.ts              # POST grant, DELETE revoke
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Select.tsx
│   │   └── Table.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageWrapper.tsx
│   ├── dashboard/
│   │   ├── KpiCard.tsx
│   │   ├── KpiGrid.tsx
│   │   ├── FilterBar.tsx
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── DataTable.tsx
│   │   └── ExportButton.tsx
│   └── admin/
│       ├── UserTable.tsx
│       ├── RoleSelect.tsx
│       └── PropertyPermissionForm.tsx
│
├── lib/
│   ├── prisma.ts                         # Prisma client singleton
│   ├── auth.ts                           # NextAuth config
│   ├── api-handler.ts                    # withAuth / withAdmin wrappers
│   ├── rate-limit.ts                     # In-memory rate limiter
│   ├── rbac.ts                           # assertPropertyAccess (throws, not bool)
│   ├── validators.ts                     # Zod schemas for all API inputs
│   ├── google-auth.ts                    # OAuth2 client + token refresh
│   ├── audit-log.ts                      # Security event logger
│   └── utils.ts                          # cn(), formatNumber(), formatDate()
│
├── services/
│   ├── gsc.ts                            # Google Search Console API calls
│   └── ga4.ts                            # Google Analytics Data API calls
│
├── middleware.ts                          # Page-level route protection
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/
│   └── promote-admin.ts                  # CLI to set first admin (no raw SQL)
│
├── types/
│   ├── next-auth.d.ts                    # Augment Session with id + role
│   ├── gsc.ts
│   └── ga4.ts
│
├── .env.local                             # Local secrets (gitignored)
├── .env.example                           # Template — safe to commit
├── PLAN.md
├── CLAUDE.md
└── README.md
```

---

## 3. Database Design

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum PropertyType {
  GSC
  GA4
}

enum AuditAction {
  LOGIN
  LOGOUT
  PERMISSION_DENIED
  ROLE_CHANGED
  PERMISSION_GRANTED
  PERMISSION_REVOKED
  PROPERTY_CREATED
  PROPERTY_DELETED
  DATA_EXPORTED
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  image       String?
  role        Role     @default(VIEWER)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  accounts    Account[]
  sessions    Session[]
  permissions Permission[]
  auditLogs   AuditLog[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Property {
  id         String       @id @default(cuid())
  name       String
  type       PropertyType
  externalId String       @unique  // GSC site URL or GA4 numeric property ID
  createdAt  DateTime     @default(now())

  permissions Permission[]
}

model Permission {
  id         String   @id @default(cuid())
  userId     String
  propertyId String
  createdAt  DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([userId, propertyId])
}

model AuditLog {
  id         String      @id @default(cuid())
  userId     String?
  action     AuditAction
  targetId   String?     // userId or propertyId being acted on
  metadata   Json?       // extra context (old role, new role, etc.)
  ip         String?
  createdAt  DateTime    @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## 4. Auth Flow

```
User clicks "Login with Google"
  → NextAuth redirects to Google OAuth consent screen
  → Google returns auth code
  → NextAuth exchanges code for access_token + refresh_token
  → NextAuth upserts User + Account in PostgreSQL via Prisma adapter
  → Session record written to PostgreSQL
  → HttpOnly Secure SameSite=Lax cookie set in browser
  → Subsequent requests: cookie → DB Session lookup → user injected into server context
  → Token refresh: googleapis auto-refreshes using refresh_token,
    new access_token written back to Account table
```

### NextAuth Config (`lib/auth.ts`)

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { log } from "@/lib/audit-log"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid email profile",
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/analytics.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id
      session.user.role = user.role
      return session
    },
    async signIn({ user }) {
      await log({ userId: user.id, action: "LOGIN" })
      return true
    },
  },
  events: {
    async signOut({ session }) {
      await log({ userId: session?.userId, action: "LOGOUT" })
    },
  },
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}
```

---

## 5. API Design

| Route | Method | Auth | Role | Purpose |
|-------|--------|------|------|---------|
| `/api/auth/[...nextauth]` | GET/POST | — | — | NextAuth handler |
| `/api/gsc/summary` | GET | Required | Any | GSC aggregate metrics |
| `/api/gsc/queries` | GET | Required | Any | GSC top queries (paginated) |
| `/api/ga4/summary` | GET | Required | Any | GA4 aggregate metrics |
| `/api/ga4/pages` | GET | Required | Any | GA4 top pages (paginated) |
| `/api/properties` | GET | Required | Any | Properties accessible to user |
| `/api/properties` | POST | Required | Admin | Create property |
| `/api/properties/[id]` | PATCH | Required | Admin | Update property |
| `/api/properties/[id]` | DELETE | Required | Admin | Delete property |
| `/api/admin/users` | GET | Required | Admin | List all users |
| `/api/admin/users/[id]` | PATCH | Required | Admin | Change user role |
| `/api/admin/users/[id]` | DELETE | Required | Admin | Remove user |
| `/api/admin/permissions` | POST | Required | Admin | Grant property access |
| `/api/admin/permissions` | DELETE | Required | Admin | Revoke property access |

### Common Query Params (GSC + GA4)

All validated via Zod before use:

```
?propertyId=<cuid>
&startDate=YYYY-MM-DD
&endDate=YYYY-MM-DD
&device=DESKTOP|MOBILE|TABLET        (optional)
&country=VNM                          (optional, ISO 3166-1 alpha-3, 3 chars)
&page=1                               (optional, 1–100)
&limit=25                             (optional, 1–50)
```

---

## 6. RBAC Logic

### Permission Matrix

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| View dashboard data | ✅ | ✅ | ✅ |
| Apply filters | ✅ | ✅ | ✅ |
| Export to Excel | ✅ | ✅ | ❌ |
| Add/remove properties | ✅ | ❌ | ❌ |
| Manage users & roles | ✅ | ❌ | ❌ |
| Grant/revoke access | ✅ | ❌ | ❌ |
| See all properties (bypass permission filter) | ✅ | ❌ | ❌ |

### Enforcement Strategy

- **Page routes:** `middleware.ts` blocks unauthenticated access, server layout components block non-admin on `/admin/*`
- **API routes:** `withAuth` / `withAdmin` wrappers enforce auth on every handler — no manual `requireSession()` calls that can be forgotten
- **Property access:** `assertPropertyAccess()` throws `ForbiddenError` (not boolean) — compile-time safe
- **Export gate:** checked both in API route and hidden in UI for Viewer role

---

## Phase 1 — Project Setup

**Objective:** Initialize repo, install all dependencies, configure environment.
**Estimated time:** 30 minutes

### Tasks

```bash
# 1. Create Next.js app
npx create-next-app@latest seo-dashboard \
  --typescript --tailwind --eslint --app --src-dir=no \
  --import-alias="@/*"

cd seo-dashboard

# 2. Install runtime dependencies
npm install \
  next-auth @auth/prisma-adapter \
  @prisma/client prisma \
  googleapis \
  @google-analytics/data \
  recharts \
  xlsx \
  zod \
  date-fns \
  lru-cache \
  clsx tailwind-merge

# 3. Dev dependencies
npm install -D @types/xlsx

# 4. Initialize Prisma
npx prisma init
```

```bash
# 5. Create folder structure
mkdir -p components/ui components/layout components/dashboard components/admin
mkdir -p lib services types scripts
mkdir -p app/login
mkdir -p "app/dashboard/gsc" "app/dashboard/ga4"
mkdir -p "app/admin/users" "app/admin/properties"
mkdir -p "app/api/auth/[...nextauth]"
mkdir -p app/api/gsc/summary app/api/gsc/queries
mkdir -p app/api/ga4/summary app/api/ga4/pages
mkdir -p "app/api/properties/[id]"
mkdir -p app/api/admin/users app/api/admin/permissions
```

### `.env.example`

```env
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Runtime
NODE_ENV=development
```

### `.gitignore` additions

```
.env.local
.env
```

### Expected Outputs
- [ ] `npm run dev` starts on `localhost:3000`
- [ ] All folders created
- [ ] `prisma/schema.prisma` initialized
- [ ] `.env.example` committed, `.env.local` gitignored

---

## Phase 2 — Database & Auth

**Objective:** Define schema, run migration, configure NextAuth with Prisma adapter and secure cookie settings.
**Estimated time:** 1 hour

### Tasks

**2.1 — Write Prisma schema**
- File: `prisma/schema.prisma`
- Copy schema from [Section 3 — Database Design](#3-database-design)

**2.2 — Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**2.3 — Prisma singleton**
- File: `lib/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

**2.4 — Audit logger**
- File: `lib/audit-log.ts`

```typescript
import { prisma } from "@/lib/prisma"
import type { AuditAction } from "@prisma/client"

interface LogParams {
  userId?: string | null
  action: AuditAction
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string
}

export async function log(params: LogParams) {
  try {
    await prisma.auditLog.create({ data: params })
  } catch {
    // Never throw from logger — log to stderr as fallback
    console.error("[AuditLog] Failed to write:", params)
  }
}
```

**2.5 — NextAuth config**
- File: `lib/auth.ts`
- Copy config from [Section 4 — Auth Flow](#4-auth-flow)

**2.6 — NextAuth route handler**
- File: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

**2.7 — Augment NextAuth Session type**
- File: `types/next-auth.d.ts`

```typescript
import type { Role } from "@prisma/client"
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
  interface User { role: Role }
}
```

**2.8 — Page-level middleware**
- File: `middleware.ts`

```typescript
export { default } from "next-auth/middleware"

export const config = {
  // Protects page routes only — API routes are guarded by withAuth wrapper
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}
```

**2.9 — Login page**
- File: `app/login/page.tsx`
- Single "Sign in with Google" button calling `signIn("google", { callbackUrl: "/dashboard" })`
- Show error message if `?error=` param present (e.g., `OAuthAccountNotLinked`)

**2.10 — Setup Google Cloud credentials**

1. [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. **APIs & Services → Enable:**
   - Google Search Console API
   - Google Analytics Data API
3. **Credentials → Create OAuth 2.0 Client ID** (Web Application)
4. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://<railway-domain>.railway.app/api/auth/callback/google
   ```
5. Copy Client ID + Secret → `.env.local`
6. Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

### Expected Outputs
- [ ] `prisma migrate dev` succeeds, all 7 tables created
- [ ] `/login` renders Google sign-in button
- [ ] Google OAuth completes, User + Account + Session rows created in DB
- [ ] `/dashboard` redirects to `/login` when unauthenticated
- [ ] Login event appears in `AuditLog` table

---

## Phase 3 — Security Layer

**Objective:** Build centralized API auth wrappers, Zod validators, rate limiter, RBAC enforcer, and error handling before any data routes are written.
**Estimated time:** 1.5 hours

> Build this phase completely before Phase 4. All API routes will use these primitives.

### Tasks

**3.1 — Centralized API handler wrappers**
- File: `lib/api-handler.ts`

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { log } from "@/lib/audit-log"
import type { Role } from "@prisma/client"
import type { Session } from "next-auth"

export type AuthedSession = Session & { user: { id: string; role: Role } }
export type ApiHandler = (req: NextRequest, session: AuthedSession) => Promise<NextResponse>

// Wraps handler: enforces auth + rate limit + catches all errors
export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = (await getServerSession(authOptions)) as AuthedSession | null
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const allowed = checkRateLimit(session.user.id)
      if (!allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }

      return await handler(req, session)
    } catch (err) {
      return handleApiError(err)
    }
  }
}

// Adds Admin role check on top of withAuth
export function withAdmin(handler: ApiHandler) {
  return withAuth(async (req, session) => {
    if (session.user.role !== "ADMIN") {
      await log({ userId: session.user.id, action: "PERMISSION_DENIED", metadata: { route: req.url } })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return handler(req, session)
  })
}

function handleApiError(err: unknown): NextResponse {
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 })
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: 400 })
  }
  // Never leak internals in production
  if (process.env.NODE_ENV !== "production") {
    console.error("[API Error]", err)
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export class ForbiddenError extends Error {
  constructor(msg = "Forbidden") { super(msg); this.name = "ForbiddenError" }
}

export class ValidationError extends Error {
  details: unknown
  constructor(msg: string, details?: unknown) {
    super(msg)
    this.name = "ValidationError"
    this.details = details
  }
}
```

**3.2 — Rate limiter**
- File: `lib/rate-limit.ts`

```typescript
import { LRUCache } from "lru-cache"

// 30 requests per 60 seconds per user ID
const WINDOW_MS = 60_000
const MAX_REQUESTS = 30

const cache = new LRUCache<string, number[]>({ max: 500 })

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const timestamps = (cache.get(identifier) ?? []).filter(t => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS) return false
  cache.set(identifier, [...timestamps, now])
  return true
}
```

**3.3 — RBAC enforcer (throw-on-fail, never returns boolean)**
- File: `lib/rbac.ts`

```typescript
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/api-handler"
import { log } from "@/lib/audit-log"
import type { Role } from "@prisma/client"

// Throws ForbiddenError if user has no access to property
// Admin bypasses all property permission checks
export async function assertPropertyAccess(
  userId: string,
  propertyId: string,
  role: Role
): Promise<void> {
  if (role === "ADMIN") return

  const perm = await prisma.permission.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  })

  if (!perm) {
    await log({ userId, action: "PERMISSION_DENIED", targetId: propertyId })
    throw new ForbiddenError("No access to this property")
  }
}

export function canExport(role: Role): boolean {
  return role === "ADMIN" || role === "EDITOR"
}
```

**3.4 — Zod validators for all API inputs**
- File: `lib/validators.ts`

```typescript
import { z } from "zod"

// Shared dashboard query (used by GSC + GA4 routes)
export const DashboardQuerySchema = z.object({
  propertyId: z.string().cuid("Invalid propertyId format"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  device: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional(),
  country: z.string().length(3, "Country must be ISO 3166-1 alpha-3").optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
})

// GA4 externalId must be numeric string
export const Ga4ExternalIdSchema = z
  .string()
  .regex(/^\d+$/, "GA4 property ID must be a numeric string")

// Create property body
export const CreatePropertySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["GSC", "GA4"]),
  externalId: z.string().min(1).max(200),
})

// Update user role
export const UpdateRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
})

// Grant/revoke permission
export const PermissionSchema = z.object({
  userId: z.string().cuid("Invalid userId"),
  propertyId: z.string().cuid("Invalid propertyId"),
})

// Helper: parse query params and throw ValidationError on failure
import { ValidationError } from "@/lib/api-handler"

export function parseQuery<T extends z.ZodTypeAny>(
  schema: T,
  req: Request
): z.infer<T> {
  const params = Object.fromEntries(new URL(req.url).searchParams)
  const result = schema.safeParse(params)
  if (!result.success) {
    throw new ValidationError("Invalid query parameters", result.error.flatten())
  }
  return result.data
}

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ValidationError("Invalid request body", result.error.flatten())
  }
  return result.data
}
```

**3.5 — Google auth client with token refresh**
- File: `lib/google-auth.ts`

```typescript
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

export async function getGoogleAuthClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })

  if (!account?.access_token) {
    throw new Error("No linked Google account or missing access token")
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })

  // Persist refreshed tokens back to DB automatically
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        ...(tokens.access_token && { access_token: tokens.access_token }),
        ...(tokens.expiry_date && { expires_at: Math.floor(tokens.expiry_date / 1000) }),
      },
    })
  })

  return oauth2Client
}
```

### Expected Outputs
- [ ] `withAuth(handler)` returns 401 for unauthenticated requests
- [ ] `withAuth(handler)` returns 429 after 30 requests/minute per user
- [ ] `withAdmin(handler)` returns 403 for non-Admin users, writes AuditLog row
- [ ] `assertPropertyAccess` throws `ForbiddenError` for unauthorized property, writes AuditLog row
- [ ] `parseQuery(DashboardQuerySchema, req)` throws `ValidationError` for invalid input
- [ ] All errors return generic message in production, never stack traces

---

## Phase 4 — Google API Integration

**Objective:** Fetch real GSC and GA4 data, expose via validated and auth-protected API routes.
**Estimated time:** 2 hours

### Tasks

**4.1 — GSC service**
- File: `services/gsc.ts`

```typescript
import { google } from "googleapis"

type GscFilters = { device?: string; country?: string }

export async function getGscSummary(
  auth: ReturnType<typeof google.auth.OAuth2>,
  siteUrl: string,
  startDate: string,
  endDate: string,
  filters?: GscFilters
) {
  const webmasters = google.webmasters({ version: "v3", auth })
  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date"],
      dimensionFilterGroups: buildFilters(filters),
    },
  })
  return res.data.rows ?? []
}

export async function getGscTopQueries(
  auth: ReturnType<typeof google.auth.OAuth2>,
  siteUrl: string,
  startDate: string,
  endDate: string,
  filters?: GscFilters,
  rowLimit = 25
) {
  const webmasters = google.webmasters({ version: "v3", auth })
  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit,
      dimensionFilterGroups: buildFilters(filters),
    },
  })
  return res.data.rows ?? []
}

function buildFilters(filters?: GscFilters) {
  if (!filters) return []
  const groups = []
  if (filters.device) {
    groups.push({ filters: [{ dimension: "device", expression: filters.device }] })
  }
  if (filters.country) {
    groups.push({ filters: [{ dimension: "country", expression: filters.country }] })
  }
  return groups
}
```

**4.2 — GA4 service**
- File: `services/ga4.ts`

```typescript
import { BetaAnalyticsDataClient } from "@google-analytics/data"
import { Ga4ExternalIdSchema } from "@/lib/validators"
import { ValidationError } from "@/lib/api-handler"

function createClient(auth: object) {
  return new BetaAnalyticsDataClient({ authClient: auth as never })
}

export async function getGa4Summary(
  auth: object,
  propertyId: string,
  startDate: string,
  endDate: string
) {
  // Validate format before sending to Google API
  const parsed = Ga4ExternalIdSchema.safeParse(propertyId)
  if (!parsed.success) throw new ValidationError("Invalid GA4 property ID format")

  const client = createClient(auth)
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "screenPageViews" },
      { name: "bounceRate" },
    ],
  })
  return response.rows ?? []
}

export async function getGa4TopPages(
  auth: object,
  propertyId: string,
  startDate: string,
  endDate: string,
  limit = 25
) {
  const parsed = Ga4ExternalIdSchema.safeParse(propertyId)
  if (!parsed.success) throw new ValidationError("Invalid GA4 property ID format")

  const client = createClient(auth)
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
    limit,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  })
  return response.rows ?? []
}
```

**4.3 — GSC summary route**
- File: `app/api/gsc/summary/route.ts`

```typescript
import { withAuth } from "@/lib/api-handler"
import { parseQuery, DashboardQuerySchema } from "@/lib/validators"
import { assertPropertyAccess } from "@/lib/rbac"
import { getGoogleAuthClient } from "@/lib/google-auth"
import { getGscSummary } from "@/services/gsc"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const GET = withAuth(async (req, session) => {
  const { propertyId, startDate, endDate, device, country } =
    parseQuery(DashboardQuerySchema, req)

  await assertPropertyAccess(session.user.id, propertyId, session.user.role)

  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } })
  const auth = await getGoogleAuthClient(session.user.id)
  const rows = await getGscSummary(auth, property.externalId, startDate, endDate, { device, country })

  return NextResponse.json({ rows })
})
```

**4.4 — GSC queries route**
- File: `app/api/gsc/queries/route.ts`
- Same pattern as summary, call `getGscTopQueries`

**4.5 — GA4 summary route**
- File: `app/api/ga4/summary/route.ts`
- Same pattern, call `getGa4Summary`

**4.6 — GA4 pages route**
- File: `app/api/ga4/pages/route.ts`
- Same pattern, call `getGa4TopPages`

**4.7 — Properties route**
- File: `app/api/properties/route.ts`

```typescript
// GET: return user's accessible properties (Admin → all, others → via Permission join)
// POST: Admin only — validate with CreatePropertySchema, create Property record

export const GET = withAuth(async (req, session) => {
  const properties = session.user.role === "ADMIN"
    ? await prisma.property.findMany()
    : await prisma.property.findMany({
        where: { permissions: { some: { userId: session.user.id } } },
      })
  return NextResponse.json({ properties })
})

export const POST = withAdmin(async (req, session) => {
  const body = parseBody(CreatePropertySchema, await req.json())
  const property = await prisma.property.create({ data: body })
  await log({ userId: session.user.id, action: "PROPERTY_CREATED", targetId: property.id })
  return NextResponse.json({ property }, { status: 201 })
})
```

### Expected Outputs
- [ ] `GET /api/gsc/summary?propertyId=X&startDate=Y&endDate=Z` returns real GSC data
- [ ] `GET /api/ga4/summary?propertyId=X&startDate=Y&endDate=Z` returns real GA4 data
- [ ] Invalid `propertyId` format returns 400 with Zod error details
- [ ] `startDate=not-a-date` returns 400
- [ ] Accessing another user's property returns 403 and writes AuditLog
- [ ] GA4 service rejects non-numeric propertyId before calling Google API

---

## Phase 5 — RBAC & Admin

**Objective:** Build admin API routes and admin UI for user and property management.
**Estimated time:** 1.5 hours

### Tasks

**5.1 — Admin users API**
- File: `app/api/admin/users/route.ts`

```typescript
export const GET = withAdmin(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, image: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ users })
})
```

- File: `app/api/admin/users/[id]/route.ts`

```typescript
// PATCH — change role
export const PATCH = withAdmin(async (req, session) => {
  const { id } = // extract from URL params
  const { role } = parseBody(UpdateRoleSchema, await req.json())

  const oldUser = await prisma.user.findUniqueOrThrow({ where: { id }, select: { role: true } })
  const updated = await prisma.user.update({ where: { id }, data: { role } })

  await log({
    userId: session.user.id,
    action: "ROLE_CHANGED",
    targetId: id,
    metadata: { from: oldUser.role, to: role },
  })

  return NextResponse.json({ user: updated })
})

// DELETE — remove user
export const DELETE = withAdmin(async (req, session) => {
  const { id } = // extract from URL params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
```

**5.2 — Admin permissions API**
- File: `app/api/admin/permissions/route.ts`

```typescript
// POST — grant access
export const POST = withAdmin(async (req, session) => {
  const { userId, propertyId } = parseBody(PermissionSchema, await req.json())
  const perm = await prisma.permission.create({ data: { userId, propertyId } })
  await log({ userId: session.user.id, action: "PERMISSION_GRANTED", targetId: userId, metadata: { propertyId } })
  return NextResponse.json({ permission: perm }, { status: 201 })
})

// DELETE — revoke access
export const DELETE = withAdmin(async (req, session) => {
  const { userId, propertyId } = parseBody(PermissionSchema, await req.json())
  await prisma.permission.delete({ where: { userId_propertyId: { userId, propertyId } } })
  await log({ userId: session.user.id, action: "PERMISSION_REVOKED", targetId: userId, metadata: { propertyId } })
  return NextResponse.json({ success: true })
})
```

**5.3 — Admin layout guard (server component)**
- File: `app/admin/layout.tsx`

```typescript
import { requireAdmin } from "@/lib/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin() // redirects non-admin to /dashboard
  return <>{children}</>
}
```

- File: `lib/session.ts`

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (session.user.role !== "ADMIN") redirect("/dashboard")
  return session
}
```

**5.4 — Admin UI: User management page**
- File: `app/admin/users/page.tsx` + `components/admin/UserTable.tsx`
- Displays: email, name, role badge, "Change Role" dropdown, revoke access button
- Calls `PATCH /api/admin/users/[id]` and `DELETE /api/admin/users/[id]`

**5.5 — Admin UI: Property management page**
- File: `app/admin/properties/page.tsx` + `components/admin/PropertyPermissionForm.tsx`
- Create property form (name, type, externalId)
- Grant/revoke access: select user + property → POST/DELETE `/api/admin/permissions`

**5.6 — Promote-admin script (no raw SQL)**
- File: `scripts/promote-admin.ts`

```typescript
import { prisma } from "@/lib/prisma"

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: npx ts-node scripts/promote-admin.ts <email>")
    process.exit(1)
  }
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  })
  console.log(`✓ Promoted ${user.email} to ADMIN (id: ${user.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
{
  "scripts": {
    "promote-admin": "ts-node scripts/promote-admin.ts"
  }
}
```

Usage after first login:
```bash
npx ts-node scripts/promote-admin.ts your-email@gmail.com
```

### Expected Outputs
- [ ] Admin can list all users via `/api/admin/users`
- [ ] Admin can change role, AuditLog records old + new role
- [ ] Admin can grant/revoke property access, AuditLog records action
- [ ] Non-admin accessing `/admin/*` is redirected to `/dashboard`
- [ ] Non-admin calling `/api/admin/*` gets 403
- [ ] Promote-admin script works without touching raw SQL

---

## Phase 6 — Dashboard UI

**Objective:** Build interactive dashboard with filters, KPI cards, charts, tables, and Excel export.
**Estimated time:** 3 hours

### Tasks

**6.1 — Utilities**
- File: `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const formatNumber = (n: number) => new Intl.NumberFormat("en").format(n)
export const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`
export const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN")
```

**6.2 — Layout components**
- File: `components/layout/Sidebar.tsx`
  - Nav links: Dashboard, GSC, GA4
  - Conditional link to `/admin` — only render if `session.user.role === "ADMIN"`
- File: `components/layout/Header.tsx`
  - Property selector (fetches `/api/properties`)
  - User avatar + sign out button
- File: `app/dashboard/layout.tsx` — wraps children with Sidebar + Header

**6.3 — KPI cards**
- File: `components/dashboard/KpiCard.tsx`
  - Props: `title`, `value`, `delta` (vs previous period), `format: "number" | "percent"`
  - Renders colored up/down arrow for delta
- File: `components/dashboard/KpiGrid.tsx`
  - Responsive 2×2 → 4-column grid of KpiCards

**6.4 — FilterBar**
- File: `components/dashboard/FilterBar.tsx`
- State: `startDate`, `endDate`, `device`, `country`
- Default date range: last 30 days (computed via `date-fns`)
- "Apply" button triggers parent `onFilter(params)` callback

**6.5 — Chart components**
- File: `components/dashboard/LineChart.tsx`
  - `ResponsiveContainer` + `LineChart` from Recharts
  - Two lines: metric A (clicks or sessions) + metric B (impressions or users)
  - X axis: formatted date
- File: `components/dashboard/BarChart.tsx`
  - Horizontal bar chart for top queries / top pages
  - Y axis: label truncated at 40 chars, X axis: value

**6.6 — DataTable**
- File: `components/dashboard/DataTable.tsx`
- Client-side features:
  - Column sort (toggle asc/desc on header click)
  - Search input (filters visible rows)
  - Pagination (10/25/50 rows per page selector)

**6.7 — ExportButton**
- File: `components/dashboard/ExportButton.tsx`

```typescript
"use client"
import * as XLSX from "xlsx"
import { canExport } from "@/lib/rbac"

interface Props {
  data: Record<string, unknown>[]
  filename: string
  role: string
}

export function ExportButton({ data, filename, role }: Props) {
  // Hide completely for Viewer — not just disabled
  if (!canExport(role as "ADMIN" | "EDITOR" | "VIEWER")) return null

  function handleExport() {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <button onClick={handleExport} className="...">
      Export to Excel
    </button>
  )
}
```

**6.8 — Dashboard overview page**
- File: `app/dashboard/page.tsx`
- Layout:
  1. `FilterBar` — controls shared state
  2. GSC `KpiGrid` — clicks, impressions, CTR, avg position
  3. GA4 `KpiGrid` — sessions, users, pageviews, bounce rate
  4. `LineChart` — clicks + sessions over time
  5. `ExportButton` — passes combined data, respects role

**6.9 — GSC detail page**
- File: `app/dashboard/gsc/page.tsx`
- FilterBar → KpiGrid → LineChart (clicks/impressions/CTR/position) → DataTable (top queries) → ExportButton

**6.10 — GA4 detail page**
- File: `app/dashboard/ga4/page.tsx`
- FilterBar → KpiGrid → LineChart (sessions/users) → DataTable (top pages) → ExportButton

### Expected Outputs
- [ ] Dashboard renders KPI cards with real GSC + GA4 data
- [ ] Changing filters refetches data and updates charts
- [ ] DataTable sorts, searches, paginates client-side
- [ ] Export produces valid `.xlsx` with current filtered data
- [ ] Export button is invisible (not just disabled) for Viewer role
- [ ] Property selector in header only shows accessible properties

---

## Phase 7 — Deployment on Railway

**Objective:** Deploy production-ready app + PostgreSQL on Railway with proper env config and migration.
**Estimated time:** 1 hour

### Tasks

**7.1 — Verify production build locally**

```bash
npm run build
```

Fix all TypeScript + ESLint errors before continuing.

**7.2 — Add Prisma migrate to build**
- File: `package.json`

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postbuild": "prisma migrate deploy"
  }
}
```

**7.3 — Create Railway project**

1. [railway.app](https://railway.app) → New Project
2. **Add Service → PostgreSQL** — copy `DATABASE_URL` from Variables tab
3. **Add Service → GitHub Repo** — select your repo
4. Railway auto-detects Next.js, sets start command to `npm start`

**7.4 — Set environment variables in Railway**

Railway → your Next.js service → Variables tab:

```env
DATABASE_URL=<Railway PostgreSQL internal URL>
NEXTAUTH_URL=https://<your-name>.railway.app
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NODE_ENV=production
```

> Use Railway's "Reference Variable" feature to link `DATABASE_URL` directly from the PostgreSQL service — avoids copy-paste errors.

**7.5 — Add production redirect URI to Google Cloud**

Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs → Add:

```
https://<your-name>.railway.app/api/auth/callback/google
```

**7.6 — Deploy and verify**

```bash
# Push to GitHub — Railway auto-deploys
git push origin main

# Watch Railway build logs for:
# ✓ prisma generate
# ✓ next build
# ✓ prisma migrate deploy — N migrations applied
# ✓ Server listening on port $PORT
```

**7.7 — Promote first admin user**

After first login on production:

```bash
# Via Railway CLI
railway run npx ts-node scripts/promote-admin.ts your-email@gmail.com
```

Or via Railway dashboard → PostgreSQL service → Query tab:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@gmail.com';
```

**7.8 — Smoke test checklist**

- [ ] `https://<name>.railway.app` loads
- [ ] `/login` → Google OAuth → redirected to `/dashboard`
- [ ] KPI cards show data (not empty, not error)
- [ ] Filter change updates charts
- [ ] Export downloads valid `.xlsx`
- [ ] Non-admin cannot reach `/admin`
- [ ] AuditLog table has entries after login

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Full public URL of the app |
| `NEXTAUTH_SECRET` | Yes | Random 32-byte secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `NODE_ENV` | Yes | `production` on Railway |

---

## Definition of Done

### Repository
- [ ] GitHub repository is public
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] `README.md` explains setup, env vars, local development
- [ ] `CLAUDE.md` describes codebase architecture
- [ ] `PLAN.md` committed at repo root
- [ ] Exported Claude conversation file committed in repo

### Authentication & Security
- [ ] Google OAuth login works on production URL
- [ ] Session persists across page refreshes (DB-backed)
- [ ] Unauthenticated requests to `/api/*` return 401
- [ ] All API routes use `withAuth` or `withAdmin` wrapper — no unprotected routes
- [ ] Rate limiter returns 429 after 30 req/min per user
- [ ] API errors never expose stack traces in production
- [ ] Security events (login, permission denied, role changes) written to AuditLog

### Data
- [ ] GSC data (clicks, impressions, CTR, position) loads correctly
- [ ] GA4 data (sessions, users, pageviews, bounce rate) loads correctly
- [ ] Invalid query params return 400 with Zod error details
- [ ] Date range, device, country filters apply correctly

### RBAC
- [ ] Admin can access `/admin` pages
- [ ] Admin can change user roles (AuditLog records old → new role)
- [ ] Admin can grant/revoke property access per user (AuditLog records action)
- [ ] Editor can view and export, cannot access `/admin`
- [ ] Viewer can view only — export button not rendered
- [ ] Accessing unauthorized property returns 403 and writes AuditLog

### Dashboard
- [ ] KPI cards show correct aggregated numbers
- [ ] Line chart renders with real data
- [ ] Bar chart shows top queries and top pages
- [ ] DataTable is sortable and searchable client-side
- [ ] Export to Excel produces valid `.xlsx` file

### Deployment
- [ ] App is live at a public Railway URL
- [ ] All secrets in Railway Variables, nothing hardcoded
- [ ] `prisma migrate deploy` runs on every production deployment
- [ ] First admin promoted via script (not raw SQL where possible)
- [ ] Production Google OAuth redirect URI configured

---

*Generated by Claude Code — `claude-sonnet-4-6` · Security audit incorporated*
