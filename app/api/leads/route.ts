import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { currentTotalCentavos, generateInvoiceItems } from "@/lib/invoice";

export const runtime = "nodejs";

// Email "verification" is intentionally FAKE. After it, we create (or reuse) a pending invoice.
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  try {
    const email = parsed.data.email.toLowerCase();
    const [lead] = await sql`
      INSERT INTO leads (email, verified) VALUES (${email}, true)
      ON CONFLICT (email) DO UPDATE SET verified = true
      RETURNING id`;

    const [existing] = await sql`
      SELECT id FROM invoices
      WHERE lead_id = ${lead.id} AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1`;

    let invoiceId: string = existing?.id;
    if (!invoiceId) {
      const total = currentTotalCentavos();
      const items = generateInvoiceItems(total);
      const [inv] = await sql`
        INSERT INTO invoices (lead_id, items, total)
        VALUES (${lead.id}, ${JSON.stringify(items)}::jsonb, ${total})
        RETURNING id`;
      invoiceId = inv.id;
    }
    return NextResponse.json({ invoiceId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error. Check the terminal." }, { status: 500 });
  }
}
