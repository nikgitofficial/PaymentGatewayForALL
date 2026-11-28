import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { generateInvoiceItems } from "@/lib/invoice";

export const runtime = "nodejs";

// Protected by middleware.ts (HTTP Basic auth with ADMIN_PASSWORD).
// issue: creates a pending service invoice for a customer email with the amount you type (PHP, VAT included).
//        If the customer registered, only the services they chose to autopay become invoice lines.
// void:  cancels an unpaid invoice (paid invoices can't be voided). Use it to fix a mistake, then issue a new one.
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("issue"),
    email: z.string().trim().toLowerCase().email(),
    totalPHP: z.number().positive().max(100_000_000),
    billing: z
      .object({
        businessName: z.string().trim().max(120).optional(),
        contactName: z.string().trim().max(80).optional(),
        phone: z.string().trim().max(30).optional(),
        tin: z.string().trim().max(30).optional(),
        addressLine: z.string().trim().max(160).optional(),
        city: z.string().trim().max(80).optional(),
        state: z.string().trim().max(80).optional(),
        postalCode: z.string().trim().max(20).optional(),
        country: z.string().trim().max(60).optional(),
      })
      .optional(),
  }),
  z.object({ action: z.literal("void"), invoiceId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and amount." }, { status: 400 });

  try {
    if (parsed.data.action === "void") {
      const rows = await sql`
        UPDATE invoices SET status = 'void'
        WHERE id = ${parsed.data.invoiceId} AND status = 'pending' RETURNING id`;
      if (!rows.length) return NextResponse.json({ error: "Only unpaid invoices can be voided." }, { status: 409 });
      // A reference already submitted for a voided invoice should not stay in the confirm queue.
      await sql`
        UPDATE payment_claims SET status = 'rejected', reviewed_at = now()
        WHERE invoice_id = ${parsed.data.invoiceId} AND status = 'pending'`;
      return NextResponse.json({ ok: true });
    }

    const { email, totalPHP, billing } = parsed.data;
    const total = Math.round(totalPHP * 100);

    const [existing] = await sql`
      SELECT i.invoice_no FROM invoices i JOIN leads l ON l.id = i.lead_id
      WHERE lower(l.email) = ${email} AND i.status = 'pending' LIMIT 1`;
    if (existing) {
      return NextResponse.json(
        { error: "This customer already has an unpaid invoice. Void it first or wait for payment." },
        { status: 409 }
      );
    }

    const [lead] = await sql`
      INSERT INTO leads (email, verified) VALUES (${email}, true)
      ON CONFLICT (email) DO UPDATE SET verified = true
      RETURNING id, services`;
    // Bill-to details typed by the owner. Blank fields keep what is already on file.
    if (billing) {
      const n = (v?: string) => (v && v.trim() ? v.trim() : null);
      await sql`
        UPDATE leads SET
          business_name = COALESCE(${n(billing.businessName)}, business_name),
          contact_name = COALESCE(${n(billing.contactName)}, contact_name),
          phone = COALESCE(${n(billing.phone)}, phone),
          tin = COALESCE(${n(billing.tin)}, tin),
          address_line = COALESCE(${n(billing.addressLine)}, address_line),
          city = COALESCE(${n(billing.city)}, city),
          state = COALESCE(${n(billing.state)}, state),
          postal_code = COALESCE(${n(billing.postalCode)}, postal_code),
          country = COALESCE(${n(billing.country)}, country)
        WHERE id = ${lead.id}`;
    }
    const services = Array.isArray(lead.services) ? (lead.services as string[]) : undefined;
    const items = generateInvoiceItems(total, services);
    const [inv] = await sql`
      INSERT INTO invoices (lead_id, items, total)
      VALUES (${lead.id}, ${JSON.stringify(items)}::jsonb, ${total})
      RETURNING id, invoice_no`;
    return NextResponse.json({ ok: true, invoiceId: inv.id, invoiceNo: inv.invoice_no });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
