import { loadLedger, TZ } from "@/lib/ledger";
import { invoiceNumber } from "@/lib/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by middleware.ts (HTTP Basic auth). CSV exports for your accountant.
//   ?type=sales       every invoice (sales register), voided ones listed with zero amounts
//   ?type=receivables unpaid invoices with days overdue
// Text cells that start with = + - @ are prefixed with ' so Excel never runs them as formulas
// (references and names are typed by customers).
const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d) : "");
const peso = (c: number) => (c / 100).toFixed(2);
const text = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (cells: (string | number)[]) => cells.map((c) => (typeof c === "number" ? String(c) : text(c))).join(",");

export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") === "receivables" ? "receivables" : "sales";
  const rows = await loadLedger();
  const now = Date.now();
  const out: string[] = [];

  if (type === "sales") {
    out.push(line(["Invoice no", "Date issued", "Due date", "Customer", "Email", "TIN", "Status", "Net of VAT (PHP)", "VAT (PHP)", "Total (PHP)", "Date paid", "Payment method", "Reference", "Amount received (PHP)", "Variance (PHP)"]));
    for (const r of rows) {
      out.push(line([
        invoiceNumber(r.invoiceNo), day(r.issuedAt), day(r.dueAt), r.business, r.email, r.tin,
        r.status === "paid" ? "Paid" : r.status === "void" ? "Void" : "Unpaid",
        peso(r.net), peso(r.vat), peso(r.total), day(r.paidAt), r.method, r.reference,
        r.amountReceived != null ? peso(r.amountReceived) : "",
        r.amountReceived != null ? peso(r.amountReceived - r.total) : "",
      ]));
    }
  } else {
    out.push(line(["Invoice no", "Date issued", "Due date", "Customer", "Email", "Total (PHP)", "Days overdue"]));
    for (const r of rows.filter((x) => x.status === "pending")) {
      out.push(line([
        invoiceNumber(r.invoiceNo), day(r.issuedAt), day(r.dueAt), r.business, r.email, peso(r.total),
        Math.max(0, Math.floor((now - r.dueAt.getTime()) / 86400000)),
      ]));
    }
  }

  return new Response("\uFEFF" + out.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "sales" ? "sales-register" : "receivables"}-${day(new Date())}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
