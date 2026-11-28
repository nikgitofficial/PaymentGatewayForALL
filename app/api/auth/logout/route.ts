import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/session";

export const runtime = "nodejs";

// Clears the login cookie and returns to the start page.
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
