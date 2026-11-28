import Link from "next/link";
import { formatPHP, invoiceNumber } from "@/lib/invoice";
import { loadLedger, monthKey, type LedgerRow } from "@/lib/ledger";
import { formatDate } from "@/lib/due";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance & reports" };

const DAY = 86400000;
const sum = (rows: LedgerRow[], f: (r: LedgerRow) => number) => rows.reduce((s, r) => s + f(r), 0);

export default async function Finance() {
  const rows = await loadLedger();
  const now = new Date();
  const thisMonth = monthKey(now);
  const thisYear = thisMonth.slice(0, 4);

  const paid = rows.filter((r) => r.status === "paid" && r.paidAt);
  const paidMonth = paid.filter((r) => monthKey(r.paidAt!) === thisMonth);
  const paidYear = paid.filter((r) => monthKey(r.paidAt!).startsWith(thisYear));
  const open = rows.filter((r) => r.status === "pending");
  const overdue = open.filter((r) => r.dueAt.getTime() < now.getTime());

  // Receivables aging by days past due.
  const days = (r: LedgerRow) => Math.floor((now.getTime() - r.dueAt.getTime()) / DAY);
  const buckets = [
    { label: "Not yet due", rows: open.filter((r) => r.dueAt.getTime() >= now.getTime()) },
    { label: "1–30 days overdue", rows: open.filter((r) => days(r) >= 1 && days(r) <= 30) },
    { label: "31–60 days overdue", rows: open.filter((r) => days(r) >= 31 && days(r) <= 60) },
    { label: "Over 60 days overdue", rows: open.filter((r) => days(r) > 60) },
  ];

  // Last 12 months, newest first.
  const [cy, cm] = thisMonth.split("-").map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(cy, cm - 1 - i, 15));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: d.toLocaleDateString("en-PH", { month: "short", year: "numeric", timeZone: "UTC" }) };
  });
  const monthly = months.map((m) => {
    const inv = rows.filter((r) => r.status !== "void" && monthKey(r.issuedAt) === m.key);
    const col = paid.filter((r) => monthKey(r.paidAt!) === m.key);
    return { ...m, invCount: inv.length, invTotal: sum(inv, (r) => r.total), colCount: col.length, colNet: sum(col, (r) => r.net), colVat: sum(col, (r) => r.vat), colTotal: sum(col, (r) => r.total) };
  });

  // Collections by method and by customer (year to date).
  const group = (key: (r: LedgerRow) => string) => {
    const m = new Map<string, { count: number; total: number }>();
    for (const r of paidYear) {
      const k = key(r);
      const g = m.get(k) ?? { count: 0, total: 0 };
      g.count++; g.total += r.total;
      m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  };
  const byMethod = group((r) => r.method || "Other");
  const byCustomer = group((r) => r.business || r.email).slice(0, 10);
  const received = paidYear.filter((r) => r.amountReceived != null);
  const variance = sum(received, (r) => (r.amountReceived as number) - r.total);

  const card = "rounded-xl border border-line bg-white px-5 py-4";
  const k = "text-[11px] font-semibold uppercase tracking-wider text-ink/50";
  const th = "px-4 py-2.5";
  const td = "px-4 py-2.5";
  const tbl = "mt-3 overflow-x-auto rounded-xl border border-line bg-white";
  const head = "border-b border-line text-xs uppercase tracking-wide text-ink/60";
  const btn = "rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Finance &amp; reports</h1>
          <p className="mt-1 text-sm text-ink/70">As of {formatDate(now)}. Collections are by date paid (cash basis); receivables are by due date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className={btn}>← Invoices &amp; payments</Link>
          <a href="/api/admin/export?type=sales" className={btn}>Export sales register (CSV)</a>
          <a href="/api/admin/export?type=receivables" className={btn}>Export receivables (CSV)</a>
        </div>
      </div>

      {/* KPIs */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={card}><p className={k}>Collected this month</p><p className="mt-1 text-2xl font-extrabold">{formatPHP(sum(paidMonth, (r) => r.total))}</p><p className="text-xs text-ink/60">{paidMonth.length} invoice{paidMonth.length === 1 ? "" : "s"}</p></div>
        <div className={card}><p className={k}>Collected year to date</p><p className="mt-1 text-2xl font-extrabold">{formatPHP(sum(paidYear, (r) => r.total))}</p><p className="text-xs text-ink/60">{paidYear.length} invoice{paidYear.length === 1 ? "" : "s"}</p></div>
        <div className={card}><p className={k}>Net sales year to date (ex-VAT)</p><p className="mt-1 text-2xl font-extrabold">{formatPHP(sum(paidYear, (r) => r.net))}</p></div>
        <div className={card}><p className={k}>VAT collected year to date</p><p className="mt-1 text-2xl font-extrabold">{formatPHP(sum(paidYear, (r) => r.vat))}</p><p className="text-xs text-ink/60">Output VAT on paid invoices</p></div>
        <div className={card}><p className={k}>Outstanding receivables</p><p className="mt-1 text-2xl font-extrabold">{formatPHP(sum(open, (r) => r.total))}</p><p className="text-xs text-ink/60">{open.length} unpaid invoice{open.length === 1 ? "" : "s"}</p></div>
        <div className={card}><p className={k}>Overdue</p><p className={"mt-1 text-2xl font-extrabold " + (overdue.length ? "text-red-700" : "")}>{formatPHP(sum(overdue, (r) => r.total))}</p><p className="text-xs text-ink/60">{overdue.length} invoice{overdue.length === 1 ? "" : "s"}</p></div>
      </section>

      {/* Aging */}
      <h2 className="mt-10 text-lg font-bold">Receivables aging</h2>
      <div className={tbl}>
        <table className="w-full text-left text-sm">
          <thead className={head}><tr><th className={th}>Bucket</th><th className={th + " text-right"}>Invoices</th><th className={th + " text-right"}>Amount</th></tr></thead>
          <tbody className="divide-y divide-line">
            {buckets.map((b) => (
              <tr key={b.label}><td className={td}>{b.label}</td><td className={td + " text-right"}>{b.rows.length}</td><td className={td + " text-right"}>{formatPHP(sum(b.rows, (r) => r.total))}</td></tr>
            ))}
            <tr className="font-bold"><td className={td}>Total outstanding</td><td className={td + " text-right"}>{open.length}</td><td className={td + " text-right"}>{formatPHP(sum(open, (r) => r.total))}</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-bold">Unpaid invoices</h2>
      <div className={tbl}>
        <table className="w-full text-left text-sm">
          <thead className={head}><tr><th className={th}>Invoice</th><th className={th}>Customer</th><th className={th}>Due</th><th className={th + " text-right"}>Days overdue</th><th className={th + " text-right"}>Amount</th></tr></thead>
          <tbody className="divide-y divide-line">
            {open.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink/60">Nothing outstanding.</td></tr>}
            {[...open].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).map((r) => (
              <tr key={r.id}>
                <td className={td + " font-semibold"}><Link href={`/invoice/${r.id}`} target="_blank" className="text-moss underline">{invoiceNumber(r.invoiceNo)}</Link></td>
                <td className={td}>{r.business && <p className="font-semibold">{r.business}</p>}<p className={r.business ? "text-xs text-ink/60" : ""}>{r.email}</p></td>
                <td className={td + " whitespace-nowrap"}>{formatDate(r.dueAt)}</td>
                <td className={td + " text-right " + (days(r) > 0 ? "font-semibold text-red-700" : "")}>{days(r) > 0 ? days(r) : "—"}</td>
                <td className={td + " text-right"}>{formatPHP(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly */}
      <h2 className="mt-10 text-lg font-bold">Monthly summary (last 12 months)</h2>
      <div className={tbl}>
        <table className="w-full text-left text-sm">
          <thead className={head}>
            <tr><th className={th}>Month</th><th className={th + " text-right"}>Invoiced</th><th className={th + " text-right"}>Collected</th><th className={th + " text-right"}>Net of VAT</th><th className={th + " text-right"}>VAT</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {monthly.map((m) => (
              <tr key={m.key}>
                <td className={td + " font-semibold"}>{m.label}</td>
                <td className={td + " text-right"}>{m.invCount ? `${formatPHP(m.invTotal)} (${m.invCount})` : "—"}</td>
                <td className={td + " text-right"}>{m.colCount ? `${formatPHP(m.colTotal)} (${m.colCount})` : "—"}</td>
                <td className={td + " text-right"}>{m.colCount ? formatPHP(m.colNet) : "—"}</td>
                <td className={td + " text-right"}>{m.colCount ? formatPHP(m.colVat) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Collections */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold">Collections by method (YTD)</h2>
          <div className={tbl}>
            <table className="w-full text-left text-sm">
              <thead className={head}><tr><th className={th}>Method</th><th className={th + " text-right"}>Invoices</th><th className={th + " text-right"}>Amount</th></tr></thead>
              <tbody className="divide-y divide-line">
                {byMethod.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-ink/60">No collections yet this year.</td></tr>}
                {byMethod.map(([m, g]) => (<tr key={m}><td className={td}>{m}</td><td className={td + " text-right"}>{g.count}</td><td className={td + " text-right"}>{formatPHP(g.total)}</td></tr>))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Reconciliation: you recorded {formatPHP(sum(received, (r) => r.amountReceived as number))} received against {formatPHP(sum(received, (r) => r.total))} billed on {received.length} manual payment{received.length === 1 ? "" : "s"}. Difference: {formatPHP(variance)}.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Top customers (YTD)</h2>
          <div className={tbl}>
            <table className="w-full text-left text-sm">
              <thead className={head}><tr><th className={th}>Customer</th><th className={th + " text-right"}>Invoices</th><th className={th + " text-right"}>Paid</th></tr></thead>
              <tbody className="divide-y divide-line">
                {byCustomer.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-ink/60">No collections yet this year.</td></tr>}
                {byCustomer.map(([c, g]) => (<tr key={c}><td className={td}>{c}</td><td className={td + " text-right"}>{g.count}</td><td className={td + " text-right"}>{formatPHP(g.total)}</td></tr>))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="mt-8 text-xs text-ink/50">
        Figures come from your issued invoices and the payments you confirmed. VAT is the amount printed on each invoice. Voided invoices are excluded from every total but stay in the sales register export so invoice numbers have no gaps. Have your accountant review these reports before using them for tax filing.
      </p>
    </main>
  );
}
