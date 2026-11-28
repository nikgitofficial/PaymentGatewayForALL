import { sql } from "./db";

export type HistoryRow = {
  id: string;
  invoiceNo: number;
  total: number; // centavos
  status: string;
  createdAt: Date;
};

// All service invoices billed to one email address, newest first (max 20).
// Email is matched case-insensitively through the leads table.
export async function getInvoiceHistory(email: string): Promise<HistoryRow[]> {
  const rows = await sql`
    SELECT i.id, i.invoice_no, i.total, i.status, i.created_at
    FROM invoices i
    JOIN leads l ON l.id = i.lead_id
    WHERE lower(l.email) = lower(${email})
    ORDER BY i.created_at DESC
    LIMIT 20`;
  return rows.map((r: any) => ({
    id: String(r.id),
    invoiceNo: Number(r.invoice_no),
    total: Number(r.total),
    status: String(r.status),
    createdAt: new Date(r.created_at),
  }));
}
