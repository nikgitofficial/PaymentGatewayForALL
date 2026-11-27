import { sql } from "./db";
import { currentTotalCentavos, generateInvoiceItems } from "./invoice";

// JSON.stringify with sorted keys (Postgres jsonb does not keep key order).
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val
  );

// Loads an invoice. If it is still pending and the configured items/total changed
// (lib/invoice-items.ts or INVOICE_TOTAL_PHP), regenerates its items and total first.
// Paid invoices are never changed.
export async function getInvoiceSynced(id: string) {
  const target = currentTotalCentavos();
  const items = generateInvoiceItems(target);
  const [found] = await sql`SELECT id, status, total, items FROM invoices WHERE id = ${id}`;
  if (!found) return null;

  if (
    found.status === "pending" &&
    (found.total !== target || stable(found.items) !== stable(items))
  ) {
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
