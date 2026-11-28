import { redirect } from "next/navigation";
import { currentLeadId } from "@/lib/session";
import Link from "next/link";
import { sql } from "@/lib/db";
import { brand } from "@/lib/brand";
import { addressLines } from "@/lib/customer";
import { getInvoiceHistory } from "@/lib/history";
import { formatPHP, invoiceNumber } from "@/lib/invoice";
import { dueDate, formatDate } from "@/lib/due";
import { SERVICE_OPTIONS } from "@/lib/services";

export const dynamic = "force-dynamic";
export const metadata = { title: "My dashboard" };

const NAVY = "#0b2559";
const GREEN = "#00b386";

// Customer dashboard. Needs a login (signed session cookie from /api/auth/login).
export default async function Dashboard() {
  const id = await currentLeadId();
  if (!id) redirect("/");

  const [lead] = await sql`
    SELECT id, email, business_name, contact_name, phone, address_line, city, state, postal_code, country, tin,
           services, service_notes, registered_at
    FROM leads WHERE id = ${id}`;
  if (!lead) redirect("/"); // stale cookie

  const history = await getInvoiceHistory(lead.email).catch(() => []);
  const visible = history.filter((h) => h.status !== "void");
  const pending = history.find((h) => h.status === "pending");
  const paidTotal = history.filter((h) => h.status === "paid").reduce((s, h) => s + h.total, 0);
  const paidCount = history.filter((h) => h.status === "paid").length;
  const services = Array.isArray(lead.services) ? (lead.services as string[]) : [];
  const desc = (n: string) => SERVICE_OPTIONS.find((s) => s.name === n)?.description ?? "";
  const registered = !!lead.registered_at;
  const name = lead.business_name || lead.email;

  const due = pending ? dueDate(pending.createdAt) : null;
  const overdue = !!due && due.getTime() < Date.now();
  const label = (s: string) => (s === "paid" ? "Paid" : s === "void" ? "Void" : "Unpaid");
  const pill = (s: string) =>
    s === "paid" ? "bg-emerald-100 text-emerald-800" : s === "void" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800";

  const stat = "rounded-xl border border-line bg-white px-5 py-4";
  const statK = "text-[11px] font-semibold uppercase tracking-wider text-ink/50";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-5xl">
        {/* ───── Header ───── */}
        <header
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-6 text-white sm:px-8"
          style={{ background: `linear-gradient(120deg, #14398a 0%, ${NAVY} 55%, #061638 100%)` }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: GREEN }}>Customer dashboard</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-0.5 text-sm text-white/70">{lead.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={brand.name} className="h-12 w-auto rounded-xl bg-white px-3 py-1.5" />
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Log out
              </button>
            </form>
          </div>
        </header>

        {/* ───── Summary ───── */}
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className={stat}>
            <p className={statK}>Amount due</p>
            <p className="mt-1 text-2xl font-extrabold" style={{ color: pending ? (overdue ? "#b91c1c" : NAVY) : GREEN }}>
              {pending ? formatPHP(pending.total) : formatPHP(0)}
            </p>
          </div>
          <div className={stat}>
            <p className={statK}>Total paid</p>
            <p className="mt-1 text-2xl font-extrabold" style={{ color: NAVY }}>{formatPHP(paidTotal)}</p>
          </div>
          <div className={stat}>
            <p className={statK}>Paid invoices</p>
            <p className="mt-1 text-2xl font-extrabold" style={{ color: NAVY }}>{paidCount}</p>
          </div>
        </section>

        {/* ───── Current invoice ───── */}
        <section className="mt-5 rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>Current invoice</h2>
          {pending && due ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{invoiceNumber(pending.invoiceNo)} · {formatPHP(pending.total)}</p>
                <p className={"text-sm " + (overdue ? "font-semibold text-red-700" : "text-ink/70")}>
                  {overdue ? "Overdue since " : "Due "}{formatDate(due)}
                </p>
              </div>
              <Link
                href={`/invoice/${pending.id}`}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#00b386]/25 hover:brightness-105"
                style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
              >
                View &amp; pay invoice
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink/70">
              You&apos;re all caught up. There is no unpaid service invoice. A new one appears here as soon as it is issued to you.
            </p>
          )}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          {/* ───── Autopay services ───── */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold" style={{ color: NAVY }}>Services on autopay</h2>
            {services.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {services.map((s) => (
                  <li key={s} className="flex gap-3 rounded-lg bg-paper px-4 py-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: GREEN }}>✓</span>
                    <span>
                      <span className="block text-sm font-semibold">{s}</span>
                      {desc(s) && <span className="block text-xs text-ink/60">{desc(s)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink/70">
                No services selected yet.{" "}
                {!registered && <Link href="/register" className="font-semibold text-moss underline">Register your business</Link>}
              </p>
            )}
            {lead.service_notes && <p className="mt-3 text-sm text-ink/70"><span className="font-semibold">Notes:</span> {lead.service_notes}</p>}
            <p className="mt-4 text-xs text-ink/50">
              To change your services{brand.email ? <>, contact <a className="underline" href={`mailto:${brand.email}`}>{brand.email}</a></> : ", contact support"}.
            </p>
          </section>

          {/* ───── Business details ───── */}
          <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold" style={{ color: NAVY }}>Business details</h2>
            {lead.business_name ? (
              <div className="mt-3 space-y-0.5 text-sm">
                <p className="font-semibold">{lead.business_name}</p>
                {lead.contact_name && <p className="text-ink/70">Attn: {lead.contact_name}</p>}
                {addressLines(lead).map((l: string) => (<p key={l} className="text-ink/70">{l}</p>))}
                {lead.tin && <p className="text-ink/70">TIN: {lead.tin}</p>}
                {lead.phone && <p className="text-ink/70">{lead.phone}</p>}
                <p className="text-ink/70">{lead.email}</p>
                {registered && <p className="pt-2 text-xs text-ink/50">Registered {formatDate(new Date(lead.registered_at))}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink/70">
                This email isn&apos;t registered yet.{" "}
                <Link href="/register" className="font-semibold text-moss underline">Register your business</Link> so your details print on invoices.
              </p>
            )}
          </section>
        </div>

        {/* ───── Invoice history ───── */}
        <section className="mt-5 rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold" style={{ color: NAVY }}>Invoices &amp; receipts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/60">
                <tr>
                  <th className="py-2.5 pr-4">Invoice</th>
                  <th className="py-2.5 pr-4">Issued</th>
                  <th className="py-2.5 pr-4 text-right">Amount</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-ink/60">No invoices yet.</td></tr>
                )}
                {visible.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 pr-4 font-semibold">{invoiceNumber(h.invoiceNo)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{h.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
                    <td className="py-3 pr-4 text-right">{formatPHP(h.total)}</td>
                    <td className="py-3 pr-4">
                      <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + pill(h.status)}>{label(h.status)}</span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <Link href={`/invoice/${h.id}`} className="font-semibold text-moss underline">
                        {h.status === "paid" ? "Receipt" : "View & pay"}
                      </Link>
                      {h.status === "paid" && (
                        <a href={`/api/invoice/${h.id}/pdf?download=1`} className="ml-3 font-semibold text-moss underline">PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-ink/50">
          Signed in as {lead.email}.
        </p>
      </div>
    </main>
  );
}
