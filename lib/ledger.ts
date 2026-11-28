import { sql } from "./db";
import { dueDate } from "./due";
import type { InvoiceItem } from "./invoice";

// One row per service invoice, with the accounting figures worked out (all money in centavos).
// Used by the finance dashboard and the CSV exports. Voided invoices are kept so the number
// sequence has no gaps, but they carry zero amounts and are left out of every total.
export type LedgerRow = {
  id: string;
  invoiceNo: number;
  email: string;
  business: string;
  tin: string;
  status: "pending" | "paid" | "void";
  issuedAt: Date;
  dueAt: Date;
  total: number;
  vat: number;
  net: number;
  paidAt: Date | null;
  method: string;
  reference: string;
  amountReceived: number | null;
};

export const TZ = "Asia/Manila";

// "2026-11" for a date, in Manila time.
export function monthKey(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

export async function loadLedger(): Promise<LedgerRow[]> {
  const rows = await sql`
    SELECT i.id, i.invoice_no, i.total, i.status, i.created_at, i.items,
           l.email, l.business_name, l.tin,
           c.method, c.reference, c.amount_received, c.reviewed_at,
           p.paid_at
    FROM invoices i
    JOIN leads l ON l.id = i.lead_id
    LEFT JOIN LATERAL (
      SELECT method, reference, amount_received, reviewed_at FROM payment_claims
      WHERE invoice_id = i.id AND status = 'confirmed' ORDER BY reviewed_at DESC LIMIT 1
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT paid_at FROM payments
      WHERE invoice_id = i.id AND status = 'paid' ORDER BY paid_at DESC LIMIT 1
    ) p ON true
    ORDER BY i.invoice_no`;

  return rows.map((r: any) => {
    const status = (r.status === "paid" || r.status === "void" ? r.status : "pending") as LedgerRow["status"];
    const voided = status === "void";
    const items = (r.items ?? []) as InvoiceItem[];
    const total = voided ? 0 : Number(r.total);
    const vat = voided ? 0 : Number(items.find((i) => i.kind === "tax")?.amount ?? 0);
    const paidRaw = r.reviewed_at ?? r.paid_at ?? null;
    return {
      id: String(r.id),
      invoiceNo: Number(r.invoice_no),
      email: String(r.email),
      business: r.business_name ? String(r.business_name) : "",
      tin: r.tin ? String(r.tin) : "",
      status,
      issuedAt: new Date(r.created_at),
      dueAt: dueDate(new Date(r.created_at)),
      total,
      vat,
      net: total - vat,
      paidAt: status === "paid" && paidRaw ? new Date(paidRaw) : null,
      method: r.method ? (r.method === "gcash" ? "GCash" : "Bank transfer") : status === "paid" && r.paid_at ? "PayMongo" : "",
      reference: r.reference ? String(r.reference) : "",
      amountReceived: r.amount_received != null ? Number(r.amount_received) : null,
    };
  });
}
