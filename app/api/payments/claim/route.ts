import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { paymentMethods, REF_PATTERN } from "@/lib/paymentinfo";

export const runtime = "nodejs";

const Body = z.object({
  invoiceId: z.string().uuid(),
  method: z.enum(["gcash", "bank"]),
  reference: z.string().trim().regex(REF_PATTERN, "Enter the reference number exactly as shown on your receipt (letters, numbers, dashes)."),
  senderName: z.string().trim().max(80).optional(),
});

// The customer says "I paid, here is my reference". Nothing is marked paid here:
// the owner confirms it on /admin after checking the real GCash / bank records.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { invoiceId, method, reference, senderName } = parsed.data;

  if (!paymentMethods().some((m) => m.id === method)) {
    return NextResponse.json({ error: "That payment method isn't available." }, { status: 400 });
  }

  try {
    const [inv] = await sql`SELECT id, status FROM invoices WHERE id = ${invoiceId}`;
    if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (inv.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
    if (inv.status === "void") return NextResponse.json({ error: "This invoice is no longer active." }, { status: 409 });

    const [open] = await sql`
      SELECT id FROM payment_claims WHERE invoice_id = ${invoiceId} AND status = 'pending' LIMIT 1`;
    if (open) {
      return NextResponse.json({ error: "A reference has already been submitted and is awaiting confirmation." }, { status: 409 });
    }

    try {
      await sql`
        INSERT INTO payment_claims (invoice_id, method, reference, sender_name)
        VALUES (${invoiceId}, ${method}, ${reference}, ${senderName || null})`;
    } catch (err: any) {
      if (err?.code === "23505") {
        return NextResponse.json({ error: "This reference number was already submitted." }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not submit your reference. Please try again." }, { status: 500 });
  }
}
