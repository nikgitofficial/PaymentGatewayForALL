import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Replaced by /api/auth/login. Kept so the old endpoint no longer reveals invoices for an email.
export async function POST() {
  return NextResponse.json({ error: "Moved. Use /api/auth/login." }, { status: 410 });
}
