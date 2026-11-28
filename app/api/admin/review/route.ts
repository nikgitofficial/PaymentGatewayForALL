import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { sendReceiptEmail } from "@/lib/email";
import type { InvoiceItem } from "@/lib/invoice";
import { maskShort } from "@/lib/mask";

export const runtime = "nodejs";

// Protected by middleware.ts (HTTP Basic auth with ADMIN_PASSWORD).
// For "confirm", the owner enters the amount actually received (in PESOS). It must be at least
// the invoice total, and it is stored on the claim for reconciliation.
export async function POST(req: Request) {
  const parsed = z
    .object({
      claimId: z.string().uuid(),
      action: z.enum(["confirm", "reject"]),
      amountReceivedPHP: z.number().positive().max(100_000_000).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { claimId, action, amountReceivedPHP } = parsed.data;

  if (action === "reject") {
    const rows = await sql`
      UPDATE payment_claims SET status = 'rejected', reviewed_at = now()
      WHERE id = ${claimId} AND status = 'pending' RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: "Already reviewed." }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (amountReceivedPHP === undefined) {
    return NextResponse.json({ error: "Enter the amount you received." }, { status: 400 });
  }
  const received = Math.round(amountReceivedPHP * 100);

  const [pre] = await sql`
    SELECT i.total FROM payment_claims c JOIN invoices i ON i.id = c.invoice_id
    WHERE c.id = ${claimId} AND c.status = 'pending'`;
  if (!pre) return NextResponse.json({ error: "Already reviewed." }, { status: 409 });
  if (received < pre.total) {
    return NextResponse.json(
      { error: "Amount received is less than the invoice total. Reject it or contact the customer." },
      { status: 422 }
    );
  }

  const [claim] = await sql`
    UPDATE payment_claims SET status = 'confirmed', reviewed_at = now(), amount_received = ${received}
    WHERE id = ${claimId} AND status = 'pending'
    RETURNING id, invoice_id, method, reference`;
  if (!claim) return NextResponse.json({ error: "Already reviewed." }, { status: 409 });

  const [inv] = await sql`
    UPDATE invoices SET status = 'paid'
    WHERE id = ${claim.invoice_id} AND status <> 'paid'
    RETURNING id, lead_id, invoice_no, items, total`;

  if (inv) {
    const [lead] = await sql`SELECT email FROM leads WHERE id = ${inv.lead_id}`;
    if (lead?.email) {
      try {
        await sendReceiptEmail({
          to: lead.email,
          invoiceNo: inv.invoice_no,
          items: inv.items as InvoiceItem[],
          total: inv.total,
          paidAt: new Date(),
          paymentMethod: `${claim.method === "gcash" ? "GCash" : "Bank transfer"} · ref ${maskShort(claim.reference)}`,
          invoiceId: inv.id,
        });
      } catch (err) {
        console.error("Receipt email failed:", err);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
