import { NextResponse, type NextRequest } from "next/server";

// Password-protects /admin and /api/admin with HTTP Basic auth.
// Set ADMIN_PASSWORD (and optionally ADMIN_USER, default "admin") in .env / Vercel.
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function middleware(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return new NextResponse("Admin is disabled: set ADMIN_PASSWORD.", { status: 503 });

  const [scheme, b64] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && b64) {
    try {
      const decoded = atob(b64);
      const i = decoded.indexOf(":");
      const user = decoded.slice(0, i);
      const given = decoded.slice(i + 1);
      if (safeEq(user, process.env.ADMIN_USER || "admin") && safeEq(given, pass)) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
