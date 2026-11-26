import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getInvoiceSynced } from "@/lib/invoice-db";
import { createCheckoutSession } from "@/lib/paymongo";
import type { InvoiceItem } from "@/lib/invoice";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z.object({ invoiceId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    const inv = await getInvoiceSynced(parsed.data.invoiceId); // picks up a changed INVOICE_TOTAL_PHP
    if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (inv.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });

    const session = await createCheckoutSession({
      invoiceId: inv.id,
      items: inv.items as InvoiceItem[],
    });
    await sql`
      INSERT INTO payments (lead_id, invoice_id, checkout_session_id, amount)
      VALUES (${inv.lead_id}, ${inv.id}, ${session.id}, ${inv.total})`;
    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
