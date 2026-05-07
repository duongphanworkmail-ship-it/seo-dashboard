# SEO Analytics Dashboard

Full-stack SEO analytics dashboard integrating **Google Search Console (GSC)** and **Google Analytics 4 (GA4)** with multi-user RBAC, interactive filters, and Excel export. Built with Next.js 16, Prisma, PostgreSQL, and deployed on Railway.

---

## Features

### Dashboard — Google Search Console
- KPI cards: Total Clicks, Impressions, Avg CTR, Avg Position
- Dimension tabs: Queries · Pages · Countries · Devices · Dates
- Keyword/dimension filter bar (type & press Enter)
- Click any Query or Page row to expand inline detail panel:
  - Query → shows related pages with KPIs
  - Page → shows related queries with KPIs
- Rows per page: 5 / 10 / 20 / All
- Paginated navigation (← Prev / Next →)
- CSV export

### Dashboard — Google Analytics 4
- KPI cards: Sessions, Users, Pageviews, Bounce Rate
- Dimension tabs: Pages · Page Titles · Sources · Countries · Devices · Channels
- Click any row to expand inline drill-down panel showing 2 related dimensions
- Rows per page: 5 / 10 / 20 / All
- Paginated navigation with exact row count (X–Y of Z rows)
- CSV export

### Admin Panel (ADMIN role only)
- User management: view all users, change roles (ADMIN / EDITOR / VIEWER)
- Property management: add GSC and GA4 properties, assign per-user permissions

### Authentication & RBAC
- Google OAuth sign-in (via NextAuth.js)
- Roles: `ADMIN` · `EDITOR` · `VIEWER`
- Permissions: per-user, per-property — users only see properties they have access to
- Audit log: LOGIN, LOGOUT, ROLE_CHANGED, PERMISSION_GRANTED/REVOKED, DATA_EXPORTED

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth.js v4 + Google OAuth |
| ORM | Prisma v7 + `@prisma/adapter-pg` |
| Database | PostgreSQL (Railway) |
| APIs | Google Search Console API v1, Google Analytics Data API v1beta |
| Charts | Recharts |
| Export | xlsx |
| Deployment | Railway |

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or Railway)
- Google Cloud project with OAuth 2.0 credentials

### 1. Clone & install

```bash
git clone <repo-url>
cd seo-dashboard
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Full URL of the app (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret — run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |

### 3. Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Search Console API** and **Google Analytics Data API**
3. Create OAuth 2.0 credentials → Web application
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-railway-domain.up.railway.app/api/auth/callback/google` (production)
5. Add OAuth scopes:
   - `https://www.googleapis.com/auth/webmasters.readonly`
   - `https://www.googleapis.com/auth/analytics.readonly`

### 4. Database setup

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. First-time setup

1. Sign in with Google — the first user is automatically assigned the `ADMIN` role
2. Go to **Admin → Properties** to add your GSC and GA4 properties
3. Go to **Admin → Users** to assign permissions to other users

#### Adding properties

- **GSC**: Use the exact property URL from GSC interface — either `sc-domain:example.com` (domain property) or `https://example.com/` (URL-prefix property with trailing slash)
- **GA4**: Use the numeric property ID (e.g., `123456789`) — find it in GA4 → Admin → Property Settings

---

## Deployment on Railway

### 1. Create a new project on Railway

1. Go to [railway.com](https://railway.com) and create a new project
2. Add a **PostgreSQL** service
3. Add a **GitHub repo** service pointing to this repository

### 2. Configure environment variables

In the Railway dashboard → your Next.js service → Variables, set:

```
DATABASE_URL          = <copy from Railway PostgreSQL service → Variables → DATABASE_URL (Internal)>
NEXTAUTH_URL          = https://your-app.up.railway.app
NEXTAUTH_SECRET       = <generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID      = <from Google Cloud Console>
GOOGLE_CLIENT_SECRET  = <from Google Cloud Console>
NODE_ENV              = production
```

> Use the **internal** `DATABASE_URL` from Railway (not the external/public one) for lower latency and no egress charges.

### 3. Deploy

Railway will automatically:
1. Run `prisma generate && next build` (build command from `package.json`)
2. Run `prisma migrate deploy` then start the server (from `railway.json`)

The app will be live at `https://your-app.up.railway.app`.

### 4. Update Google OAuth redirect URI

Add the production URL to your Google OAuth 2.0 client's authorized redirect URIs:
```
https://your-app.up.railway.app/api/auth/callback/google
```

---

## Project Structure

```
seo-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── properties/           # CRUD for properties
│   │   ├── admin/                # Admin: users, permissions
│   │   ├── ga4/                  # GA4 summary + pages endpoints
│   │   └── gsc/                  # GSC summary + queries endpoints
│   ├── dashboard/
│   │   ├── gsc/page.tsx          # GSC dashboard page
│   │   └── ga4/page.tsx          # GA4 dashboard page
│   ├── admin/
│   │   ├── users/page.tsx        # User management
│   │   └── properties/page.tsx   # Property management
│   └── login/page.tsx
├── components/
│   ├── dashboard/
│   │   ├── DataTable.tsx         # Generic sortable table with inline expansion
│   │   ├── DimensionTabs.tsx     # Pill-style dimension selector
│   │   ├── ExportButton.tsx      # CSV export
│   │   ├── FilterBar.tsx         # Date range + property + device filter
│   │   ├── Ga4DrillPanel.tsx     # GA4 inline cross-dimension drill-down
│   │   ├── GscDetailPanel.tsx    # GSC inline query↔page detail panel
│   │   ├── KpiCard.tsx           # Metric summary card
│   │   ├── Pagination.tsx        # Prev/Next pagination
│   │   └── QuerySearchBar.tsx    # Keyword search filter
│   ├── layout/                   # Sidebar, Header, PageWrapper
│   └── ui/                       # Button, Card, Badge, Select
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── google-auth.ts            # OAuth2 token helper for APIs
│   ├── rbac.ts                   # Role + permission checks
│   ├── validators.ts             # Zod request validation schemas
│   └── audit-log.ts              # Audit logging helper
├── prisma/
│   └── schema.prisma             # DB schema: User, Property, Permission, AuditLog
├── .env.example                  # Environment variable template
├── railway.json                  # Railway deployment config
└── next.config.ts                # Next.js config (standalone output)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/properties` | List properties accessible to the current user |
| POST | `/api/properties` | Create a new property (ADMIN/EDITOR) |
| DELETE | `/api/properties/:id` | Delete a property (ADMIN) |
| GET | `/api/gsc/summary` | GSC aggregate KPIs |
| GET | `/api/gsc/queries` | GSC dimension table rows with pagination |
| GET | `/api/ga4/summary` | GA4 aggregate KPIs |
| GET | `/api/ga4/pages` | GA4 dimension table rows with pagination |
| GET | `/api/admin/users` | List all users (ADMIN) |
| PATCH | `/api/admin/users/:id` | Update user role (ADMIN) |
| GET | `/api/admin/permissions` | List property permissions (ADMIN) |
| POST | `/api/admin/permissions` | Grant permission (ADMIN) |
| DELETE | `/api/admin/permissions` | Revoke permission (ADMIN) |
