import { sql } from "@/lib/db";
import { verifyWebhook } from "@/lib/paymongo";
import { sendReceiptEmail } from "@/lib/email";
import type { InvoiceItem } from "@/lib/invoice";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text(); // raw body is required for signature checking
  if (!verifyWebhook(raw, req.headers.get("paymongo-signature") ?? undefined)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(raw);
  const attrs = event.data?.attributes ?? event.data;

  if (attrs?.type === "checkout_session.payment.paid") {
    const sessionData = attrs?.data;
    const sessionId = sessionData?.id ?? event.data?.data?.id;
    const method: string | undefined =
      sessionData?.attributes?.payments?.[0]?.attributes?.source?.type ??
      sessionData?.attributes?.payment_method_used;

    if (sessionId) {
      const rows = await sql`
        UPDATE payments SET status = 'paid', paid_at = now()
        WHERE checkout_session_id = ${sessionId}
        RETURNING invoice_id`;

      if (rows[0]?.invoice_id) {
        // Only the first webhook delivery flips pending -> paid, so the email is sent once.
        const [inv] = await sql`
          UPDATE invoices SET status = 'paid'
          WHERE id = ${rows[0].invoice_id} AND status <> 'paid'
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
                paymentMethod: method,
                invoiceId: inv.id,
              });
            } catch (err) {
              console.error("Receipt email failed:", err); // never fail the webhook over email
            }
          }
        }
      }
    }
  }
  return new Response("ok", { status: 200 });
}
