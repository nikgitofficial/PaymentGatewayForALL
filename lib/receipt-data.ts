import { sql } from "./db";
import { getInvoiceSynced } from "./invoice-db";
import { maskShort } from "./mask";
import type { InvoiceItem } from "./invoice";
import type { CustomerInfo } from "./customer";

export type PaidReceiptData = {
  invoiceId: string;
  invoiceNo: number;
  email: string;
  items: InvoiceItem[];
  total: number; // centavos
  issuedAt: Date;
  paidAt: Date | null;
  paymentMethod?: string;
  customer: CustomerInfo;
};

// Loads everything a receipt (PDF or email) needs. Receipts exist only for PAID invoices.
export async function loadPaidReceipt(
  id: string
): Promise<{ kind: "notfound" } | { kind: "unpaid" } | { kind: "ok"; data: PaidReceiptData }> {
  const inv = await getInvoiceSynced(id);
  if (!inv) return { kind: "notfound" };
  if (inv.status !== "paid") return { kind: "unpaid" };

  const [claim] = await sql`
    SELECT method, reference, reviewed_at FROM payment_claims
    WHERE invoice_id = ${id} AND status = 'confirmed' ORDER BY reviewed_at DESC LIMIT 1`;
  const [pay] = claim
    ? []
    : await sql`SELECT paid_at FROM payments WHERE invoice_id = ${id} AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`;
  const paidRaw = claim?.reviewed_at ?? pay?.paid_at ?? null;

  return {
    kind: "ok",
    data: {
      invoiceId: inv.id,
      invoiceNo: inv.invoice_no,
      email: inv.email,
      customer: {
        business_name: inv.business_name, contact_name: inv.contact_name, phone: inv.phone,
        address_line: inv.address_line, city: inv.city, state: inv.state,
        postal_code: inv.postal_code, country: inv.country, tin: inv.tin,
      },
      items: inv.items as InvoiceItem[],
      total: inv.total,
      issuedAt: new Date(inv.created_at),
      paidAt: paidRaw ? new Date(paidRaw) : null,
      paymentMethod: claim
        ? `${claim.method === "gcash" ? "GCash" : "Bank transfer"} · ref ${maskShort(claim.reference)}`
        : pay
          ? "PayMongo (online)"
          : undefined,
    },
  };
}
