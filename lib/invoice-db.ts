import { sql } from "./db";
import { currentTotalCentavos, generateInvoiceItems } from "./invoice";

// Loads an invoice. If it is still pending and INVOICE_TOTAL_PHP has changed,
// regenerates its items and total first. Paid invoices are never changed.
export async function getInvoiceSynced(id: string) {
  const target = currentTotalCentavos();
  const [found] = await sql`SELECT id, status, total FROM invoices WHERE id = ${id}`;
  if (!found) return null;

  if (found.status === "pending" && found.total !== target) {
    const items = generateInvoiceItems(target);
    await sql`
      UPDATE invoices SET items = ${JSON.stringify(items)}::jsonb, total = ${target}
      WHERE id = ${id} AND status = 'pending'`;
  }

  const [inv] = await sql`
    SELECT i.id, i.lead_id, i.invoice_no, i.items, i.total, i.status, i.created_at, l.email
    FROM invoices i JOIN leads l ON l.id = i.lead_id
    WHERE i.id = ${id}`;
  return inv ?? null;
}
