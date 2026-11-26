import { sql } from "@/lib/db";
import { verifyWebhook } from "@/lib/paymongo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text(); // raw body is required for signature checking
  if (!verifyWebhook(raw, req.headers.get("paymongo-signature") ?? undefined)) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(raw);
  const attrs = event.data?.attributes ?? event.data;

  if (attrs?.type === "checkout_session.payment.paid") {
    const sessionId = attrs?.data?.id ?? event.data?.data?.id;
    if (sessionId) {
      const rows = await sql`
        UPDATE payments SET status = 'paid', paid_at = now()
        WHERE checkout_session_id = ${sessionId}
        RETURNING invoice_id`;
      if (rows[0]?.invoice_id) {
        await sql`UPDATE invoices SET status = 'paid' WHERE id = ${rows[0].invoice_id}`;
      }
    }
  }
  return new Response("ok", { status: 200 });
}
