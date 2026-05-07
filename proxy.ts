import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"

export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin")

  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}
