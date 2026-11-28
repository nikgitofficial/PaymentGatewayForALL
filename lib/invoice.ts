import { INVOICE_LINES, TAX_LABEL, TAX_RATE } from "./invoice-items";

// amount in centavos. kind "tax" marks the tax line (shown separately, included in the total).
export type InvoiceItem = {
  name: string;
  description: string;
  amount: number;
  details?: string[];
  kind?: "tax";
};

// Total you want customers to pay (tax included), in pesos, from .env. Optional.
function envTotalCentavos() {
  const pesos = Number(process.env.INVOICE_TOTAL_PHP);
  return Number.isFinite(pesos) && pesos > 0 ? Math.round(pesos * 100) : 0;
}

// Splits `amount` across weights exactly (largest remainder), so parts always sum to `amount`.
function allocate(amount: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (amount * w) / sum);
  const out = raw.map(Math.floor);
  let left = amount - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - out[i] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (left-- > 0) out[i]++;
    });
  return out;
}

// `totalCentavos` is the amount the owner typed when issuing an invoice (VAT included).
// `services` are the service names the customer chose on /register; only those lines are billed.
// With no services (or none that match), every line in lib/invoice-items.ts is used.
function buildItems(totalCentavos?: number, services?: string[]): InvoiceItem[] {
  const priced = INVOICE_LINES.filter((l) => Number.isFinite(l.pricePHP) && l.pricePHP > 0);
  const chosen = services?.length ? priced.filter((l) => services.includes(l.name)) : [];
  const valid = chosen.length ? chosen : priced;
  if (!valid.length) return [];

  const withDetails = (l: (typeof valid)[number]) => (l.details?.length ? { details: l.details } : {});
  const envTotal = totalCentavos && totalCentavos > 0 ? totalCentavos : envTotalCentavos();
  let lines: InvoiceItem[];
  let tax: number;

  if (envTotal > 0) {
    // The total is the final amount incl. tax. Remove tax, then share the rest
    // across the services in proportion to their pricePHP values.
    const subtotal = TAX_RATE > 0 ? Math.round(envTotal / (1 + TAX_RATE / 100)) : envTotal;
    const parts = allocate(subtotal, valid.map((l) => l.pricePHP));
    lines = valid
      .map((l, i) => ({ name: l.name, description: l.description, amount: parts[i], ...withDetails(l) }))
      .filter((l) => l.amount > 0);
    tax = envTotal - subtotal;
  } else {
    lines = valid.map((l) => ({
      name: l.name,
      description: l.description,
      amount: Math.round(l.pricePHP * 100),
      ...withDetails(l),
    }));
    const subtotal = lines.reduce((s, i) => s + i.amount, 0);
    tax = TAX_RATE > 0 ? Math.round((subtotal * TAX_RATE) / 100) : 0;
  }

  if (tax > 0) {
    const base = lines.reduce((s, i) => s + i.amount, 0);
    lines.push({
      name: `${TAX_LABEL} (${TAX_RATE}%)`,
      description: `${TAX_LABEL} on ${formatPHP(base)}`,
      amount: tax,
      kind: "tax",
    });
  }
  return lines;
}

// Total (incl. tax). If INVOICE_TOTAL_PHP is set in .env it wins; otherwise it is the sum of
// the lines in lib/invoice-items.ts plus tax. With no lines, falls back to a 300 PHP single item.
export function currentTotalCentavos() {
  const env = envTotalCentavos();
  if (env > 0) return env;
  const items = buildItems();
  if (items.length) return items.reduce((s, i) => s + i.amount, 0);
  return 30000;
}

export function generateInvoiceItems(totalCentavos: number, services?: string[]): InvoiceItem[] {
  const items = buildItems(totalCentavos, services);
  if (items.length) return items;
  return [
    {
      name: process.env.INVOICE_ITEM_NAME || "Payment Gateway for All service",
      description: process.env.INVOICE_ITEM_DESCRIPTION || "Service payment",
      amount: totalCentavos,
    },
  ];
}

// For display: subtotal (without tax), tax amount and the tax label.
export function splitTotals(items: InvoiceItem[]) {
  const taxItem = items.find((i) => i.kind === "tax");
  const subtotal = items.filter((i) => i.kind !== "tax").reduce((s, i) => s + i.amount, 0);
  return { subtotal, tax: taxItem?.amount ?? 0, taxLabel: taxItem?.name ?? "" };
}

export const formatPHP = (centavos: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

// Sequential: 1 -> SI-001, 2 -> SI-002 ... 1000 -> SI-1000. Change the prefix with INVOICE_PREFIX in .env.
export const invoiceNumber = (no: number) =>
  (process.env.INVOICE_PREFIX || "SI-") + String(no).padStart(3, "0");
