import { sql } from "./db";

// Loads one invoice with the customer's email. Invoices are issued from the admin page with
// a fixed amount and are never rewritten afterwards (corrections = void + issue a new one).
// The name is kept so existing imports keep working.
export async function getInvoiceSynced(id: string) {
  const [inv] = await sql`
    SELECT i.id, i.lead_id, i.invoice_no, i.items, i.total, i.status, i.created_at, l.email,
           l.business_name, l.contact_name, l.phone, l.address_line, l.city, l.state,
           l.postal_code, l.country, l.tin
    FROM invoices i JOIN leads l ON l.id = i.lead_id
    WHERE i.id = ${id}`;
  return inv ?? null;
}
