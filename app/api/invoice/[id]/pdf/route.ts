import { readFile } from "fs/promises";
import path from "path";
import { invoiceNumber } from "@/lib/invoice";
import { addressLines } from "@/lib/customer";
import { loadPaidReceipt } from "@/lib/receipt-data";
import { buildReceiptPdf } from "@/lib/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PDF receipt (marked PAID). Only available once the invoice is paid.
// Same access model as the /invoice/<id> page: the unguessable id in the link is the key.
// ?download=1 forces a file download; otherwise the browser shows it.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const r = await loadPaidReceipt(id);
  if (r.kind === "notfound") return new Response("Not found", { status: 404 });
  if (r.kind === "unpaid") return new Response("A receipt is available once the invoice is paid.", { status: 409 });
  const d = r.data;

  let logoPng: Uint8Array | undefined;
  try {
    logoPng = await readFile(path.join(process.cwd(), "public", "logo.png"));
  } catch {} // no logo file available: the receipt is still produced

  const bytes = await buildReceiptPdf({
    invoiceNo: d.invoiceNo,
    email: d.email,
    billTo: {
      name: d.customer.business_name ?? undefined,
      contact: d.customer.contact_name ?? undefined,
      phone: d.customer.phone ?? undefined,
      lines: addressLines(d.customer),
      tin: d.customer.tin ?? undefined,
    },
    items: d.items,
    total: d.total,
    issuedAt: d.issuedAt,
    paidAt: d.paidAt,
    paymentMethod: d.paymentMethod,
    logoPng,
  });

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoiceNumber(d.invoiceNo)}-receipt.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
