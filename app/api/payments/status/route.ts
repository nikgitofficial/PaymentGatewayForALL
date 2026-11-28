import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Polled by the invoice page while a reference is waiting for confirmation.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("invoiceId") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid invoice." }, { status: 400 });
  const [inv] = await sql`SELECT status FROM invoices WHERE id = ${id}`;
  if (!inv) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [claim] = await sql`
    SELECT status FROM payment_claims WHERE invoice_id = ${id} ORDER BY created_at DESC LIMIT 1`;
  return NextResponse.json({ invoiceStatus: inv.status, claimStatus: claim?.status ?? null });
}
