import { loadPaidReceipt } from "@/lib/receipt-data";
import { receiptHtml } from "@/lib/email";
import { getInvoiceHistory } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The designed receipt email as HTML. The admin page copies this to the clipboard so you can
// paste it straight into a Gmail message. Only for PAID invoices; same access model as the PDF.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const r = await loadPaidReceipt(id);
  if (r.kind === "notfound") return new Response("Not found", { status: 404 });
  if (r.kind === "unpaid") return new Response("A receipt is available once the invoice is paid.", { status: 409 });
  const d = r.data;

  const history = await getInvoiceHistory(d.email).catch(() => []);
  const html = receiptHtml({
    to: d.email,
    invoiceNo: d.invoiceNo,
    items: d.items,
    total: d.total,
    paidAt: d.paidAt ?? d.issuedAt,
    paymentMethod: d.paymentMethod,
    invoiceId: d.invoiceId,
    history,
    billTo: d.customer,
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" },
  });
}
