import { INVOICE_LINES } from "./invoice-items";

// The services a customer can pick on /register to have paid automatically.
// Derived from lib/invoice-items.ts so the registration choices and the invoice lines always match.
export const SERVICE_OPTIONS = INVOICE_LINES.map((l) => ({ name: l.name, description: l.description }));
export const SERVICE_NAMES = SERVICE_OPTIONS.map((s) => s.name);
