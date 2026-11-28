import { notFound } from "next/navigation";
import { getInvoiceSynced } from "@/lib/invoice-db";
import { formatPHP, invoiceNumber, splitTotals, type InvoiceItem } from "@/lib/invoice";
import { brand } from "@/lib/brand";
import { addressLines } from "@/lib/customer";
import PaymentPanel from "./PaymentPanel";
import { sql } from "@/lib/db";
import { paymentMethods } from "@/lib/paymentinfo";
import { maskShort } from "@/lib/mask";
import PrintButtons from "./PrintButtons";
import { getInvoiceHistory } from "@/lib/history";
import { DUE_DAYS, dueDate, formatDate } from "@/lib/due";
import Link from "next/link";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAVY = "#0b2559";
const GREEN = "#00b386";
// Keep the colored header when printing / saving as PDF.
const keepColor = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const inv = await getInvoiceSynced(id);
  if (!inv) notFound();

  if (inv.status === "void") {
    return (
      <main className="grid min-h-screen place-items-center px-5 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">This service invoice is no longer active</h1>
          <p className="mt-3 text-ink/70">
            {invoiceNumber(inv.invoice_no)} was cancelled and does not need to be paid.
            {brand.email ? ` Questions? Contact ${brand.email}.` : ""}
          </p>
          <Link href="/" className="mt-6 inline-block rounded-lg bg-moss px-5 py-3 font-semibold text-white hover:bg-moss-dark">
            Back to start
          </Link>
        </div>
      </main>
    );
  }

  const items = inv.items as InvoiceItem[];
  const lineItems = items.filter((i) => i.kind !== "tax");
  const { subtotal, tax, taxLabel } = splitTotals(items);
  const paid = inv.status === "paid";
  const [lastClaim] = paid
    ? []
    : await sql`SELECT status FROM payment_claims WHERE invoice_id = ${id} ORDER BY created_at DESC LIMIT 1`;
  const [paidClaim] = paid
    ? await sql`SELECT method, reference, reviewed_at FROM payment_claims WHERE invoice_id = ${id} AND status = 'confirmed' ORDER BY reviewed_at DESC LIMIT 1`
    : [];
  // Card/QR payments made through PayMongo are recorded in "payments" instead.
  const [paidPay] = paid
    ? await sql`SELECT paid_at FROM payments WHERE invoice_id = ${id} AND status = 'paid' ORDER BY paid_at DESC LIMIT 1`
    : [];
  const paidAtRaw = paidClaim?.reviewed_at ?? paidPay?.paid_at ?? null;
  const paidDate = paidAtRaw ? formatDate(new Date(paidAtRaw)) : null;
  const initialClaim = lastClaim?.status === "pending" || lastClaim?.status === "rejected" ? lastClaim.status : null;
  const history = await getInvoiceHistory(inv.email).catch(() => []);
  const date = new Date(inv.created_at).toLocaleDateString("en-PH", { dateStyle: "long" });
  const due = formatDate(dueDate(inv.created_at));
  const overdue = !paid && dueDate(inv.created_at).getTime() < Date.now();

  const statusText = paid ? "PAID" : overdue ? "OVERDUE" : "UNPAID";
  const statusStyle = paid
    ? { background: GREEN, color: "#fff" }
    : overdue
      ? { background: "#dc2626", color: "#fff" }
      : { background: "#fbbf24", color: "#451a03" };

  const meta: { k: string; v: string; accent?: boolean }[] = [
    { k: "Date issued", v: date },
    paid ? { k: "Date paid", v: paidDate ?? "—" } : { k: "Due date", v: overdue ? `${due} (overdue)` : due, accent: overdue },
    ...(paidClaim
      ? [{ k: "Payment method", v: `${paidClaim.method === "gcash" ? "GCash" : "Bank transfer"} · ref ${maskShort(paidClaim.reference)}` }]
      : paidPay
        ? [{ k: "Payment method", v: "PayMongo (online)" }]
        : [{ k: "Payment terms", v: `Net ${DUE_DAYS} days` }]),
  ];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-5 sm:py-10 print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between print:hidden">
        <Link href="/dashboard" className="text-sm font-semibold text-moss underline">← My dashboard</Link>
        <PrintButtons fileName={`${invoiceNumber(inv.invoice_no)}-${paid ? "receipt" : "service-invoice"}`} />
      </div>

      <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(11,37,89,.35)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        {/* ───── Header band ───── */}
        <header
          className="flex flex-wrap items-center justify-between gap-5 px-6 py-6 text-white sm:px-10 sm:py-8"
          style={{ ...keepColor, background: `linear-gradient(120deg, #14398a 0%, ${NAVY} 55%, #061638 100%)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={brand.name} className="h-14 w-auto rounded-xl bg-white px-3 py-1.5" />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: GREEN }}>
              {paid ? "Receipt" : "Service Invoice"}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{invoiceNumber(inv.invoice_no)}</p>
            <span
              className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold tracking-widest"
              style={{ ...keepColor, ...statusStyle }}
            >
              {statusText}
            </span>
          </div>
        </header>
        <div className="h-1" style={{ ...keepColor, background: `linear-gradient(90deg, ${GREEN}, #7cf5d0)` }} />

        <div className="px-6 py-8 sm:px-10">
          {/* ───── Key dates ───── */}
          <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-3">
            {meta.map((m) => (
              <div key={m.k} className="bg-paper px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">{m.k}</dt>
                <dd className={"mt-0.5 font-semibold " + (m.accent ? "text-red-700" : "")}>{m.v}</dd>
              </div>
            ))}
          </dl>

          {/* ───── From / Bill to ───── */}
          <div className="mt-8 grid gap-8 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">From</p>
              <p className="mt-1.5 font-bold" style={{ color: NAVY }}>{brand.name}</p>
              {brand.address && <p className="text-ink/70">{brand.address}</p>}
              {brand.email && <p className="text-ink/70">{brand.email}</p>}
              {brand.tin && <p className="text-ink/70">TIN: {brand.tin}</p>}
              {brand.vatStatus && <p className="text-ink/70">{brand.vatStatus}</p>}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Bill to</p>
              {inv.business_name && <p className="mt-1.5 font-bold" style={{ color: NAVY }}>{inv.business_name}</p>}
              {inv.contact_name && <p className="text-ink/70">Attn: {inv.contact_name}</p>}
              <p className={"text-ink/70 " + (inv.business_name ? "" : "mt-1.5")}>{inv.email}</p>
              {inv.phone && <p className="text-ink/70">{inv.phone}</p>}
              {addressLines(inv).map((l: string) => (
                <p key={l} className="text-ink/70">{l}</p>
              ))}
              {inv.tin && <p className="text-ink/70">TIN: {inv.tin}</p>}
              {!inv.business_name && <p className="mt-1 text-xs italic text-ink/50">Business details not provided yet.</p>}
            </div>
          </div>

          {/* ───── Amount headline ───── */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-line bg-paper px-5 py-4" style={keepColor}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">{paid ? "Amount paid" : "Amount due"}</p>
              <p className="text-3xl font-extrabold tracking-tight" style={{ color: NAVY }}>{formatPHP(inv.total)}</p>
            </div>
            {!paid && <p className="text-sm text-ink/70">Please pay by <strong className={overdue ? "text-red-700" : ""}>{due}</strong></p>}
          </div>

          {/* ───── Services ───── */}
          <h2 className="mt-8 text-base font-bold" style={{ color: NAVY }}>Services included</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white" style={{ ...keepColor, background: NAVY }}>
                <th className="w-10 rounded-tl-lg px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="rounded-tr-lg px-3 py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.name} className="border-b border-line align-top">
                  <td className="px-3 py-4 text-ink/50">{idx + 1}</td>
                  <td className="px-3 py-4">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-ink/60">{item.description}</p>
                    {item.details && item.details.length > 0 && (
                      <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-xs text-ink/60 sm:grid-cols-2">
                        {item.details.map((d) => (
                          <li key={d} className="flex gap-1.5">
                            <span style={{ color: GREEN }}>✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right font-semibold">{formatPHP(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ───── Totals ───── */}
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            {tax > 0 && (
              <>
                <div className="flex justify-between"><span className="text-ink/70">Subtotal</span><span>{formatPHP(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-ink/70">{taxLabel}</span><span>{formatPHP(tax)}</span></div>
              </>
            )}
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5 text-white" style={{ ...keepColor, background: NAVY }}>
              <span className="font-semibold">{paid ? "Amount paid" : "Total due"}</span>
              <span className="text-lg font-extrabold">{formatPHP(inv.total)}</span>
            </div>
          </div>

          {!paid && (
            <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Payment terms</p>
              <p className="mt-1">
                Payment is due within {DUE_DAYS} days of the date issued ({due}). If payment is delayed beyond {DUE_DAYS} days,
                your services may be slowed or locked until the balance is settled.
              </p>
            </div>
          )}

          <div className="mt-8 print:hidden">
            {paid ? (
              <p className="rounded-xl bg-paper px-4 py-3 text-center text-ink/70">This service invoice has been paid. Thank you.</p>
            ) : (
              <PaymentPanel
                invoiceId={inv.id}
                invoiceLabel={invoiceNumber(inv.invoice_no)}
                amountLabel={formatPHP(inv.total)}
                email={inv.email}
                methods={paymentMethods()}
                contactEmail={brand.email}
                initialClaim={initialClaim}
              />
            )}
          </div>
          {!paid && (
            <p className="mt-4 text-xs text-ink/50 print:hidden">
              Pay by GCash or bank transfer, then enter your reference number. We confirm it and email your receipt.
            </p>
          )}

          {history.length > 1 && (
            <section className="mt-10 border-t border-line pt-6 print:hidden">
              <h2 className="text-base font-bold" style={{ color: NAVY }}>Invoice history</h2>
              <p className="mt-1 text-xs text-ink/60">All service invoices for {inv.email}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink/60">
                      <th className="py-2 font-semibold">Invoice</th>
                      <th className="py-2 font-semibold">Date</th>
                      <th className="py-2 text-right font-semibold">Amount</th>
                      <th className="py-2 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className={"border-b border-line " + (h.id === inv.id ? "bg-paper" : "")}>
                        <td className="py-2 font-semibold">
                          {h.id === inv.id ? (
                            <>{invoiceNumber(h.invoiceNo)} <span className="font-normal text-ink/50">(this one)</span></>
                          ) : (
                            <Link href={`/invoice/${h.id}`} className="text-moss underline">{invoiceNumber(h.invoiceNo)}</Link>
                          )}
                        </td>
                        <td className="py-2">{h.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
                        <td className="py-2 text-right">{formatPHP(h.total)}</td>
                        <td className="py-2 text-right">{h.status === "paid" ? "Paid" : h.status === "void" ? "Void" : "Unpaid"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* ───── Footer ───── */}
        <footer className="border-t border-line bg-paper px-6 py-4 text-center text-xs text-ink/60 sm:px-10" style={keepColor}>
          Thank you for choosing <strong>{brand.name}</strong>.
          {brand.email ? <> Questions about this {paid ? "receipt" : "invoice"}? Contact {brand.email}.</> : null}
        </footer>
      </article>
    </main>
  );
}
