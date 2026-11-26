export type InvoiceItem = { name: string; description: string; amount: number }; // amount in centavos

const CATALOG = [
  { name: "Neon database hosting", description: "Monthly managed Postgres", weight: 3 },
  { name: "Claude Code", description: "Monthly AI coding subscription", weight: 2 },
  { name: "Claude API usage", description: "Monthly API consumption", weight: 3 },
  { name: "Server CPU / compute", description: "Monthly compute resources", weight: 3 },
  { name: "Storage & bandwidth", description: "Monthly data storage and transfer", weight: 1 },
];

// Reads INVOICE_TOTAL_PHP (pesos) and returns centavos. Falls back to 30000 if missing/invalid.
export function currentTotalCentavos() {
  const pesos = Number(process.env.INVOICE_TOTAL_PHP);
  return Math.round((Number.isFinite(pesos) && pesos > 0 ? pesos : 30000) * 100);
}

// Randomly splits the total across the catalog. Items always add up to the total exactly.
export function generateInvoiceItems(totalCentavos: number): InvoiceItem[] {
  const pesos = totalCentavos / 100;
  let step = pesos >= 5000 ? 5000 : pesos >= 500 ? 1000 : 100; // round to ₱50 / ₱10 / ₱1
  if (totalCentavos % step !== 0) step = 1;
  const units = totalCentavos / step;

  const weights = CATALOG.map((c) => c.weight * (0.6 + Math.random() * 0.8));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (units * w) / sum);
  const alloc = raw.map(Math.floor);
  const left = units - alloc.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - alloc[i] }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, left)
    .forEach(({ i }) => alloc[i]++);

  return CATALOG.map((c, i) => ({
    name: c.name,
    description: c.description,
    amount: alloc[i] * step,
  })).filter((item) => item.amount > 0);
}

export const formatPHP = (centavos: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

// Sequential: 1 -> INV-001, 2 -> INV-002 ... 1000 -> INV-1000
export const invoiceNumber = (no: number) => "INV-" + String(no).padStart(3, "0");
