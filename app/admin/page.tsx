import Link from "next/link";
import { sql } from "@/lib/db";
import { currentTotalCentavos, formatPHP, invoiceNumber } from "@/lib/invoice";
import ReviewButtons from "./ReviewButtons";
import IssueInvoiceForm from "./IssueInvoiceForm";
import VoidButton from "./VoidButton";
import EmailReceiptButton from "./EmailReceiptButton";
import { brand } from "@/lib/brand";
import { maskTail } from "@/lib/mask";
import { addressLines } from "@/lib/customer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service invoices & payments" };

const methodLabel = (m: string) => (m === "gcash" ? "GCash" : "Bank transfer");

export default async function Admin({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue } = await searchParams;
  const issueEmail = typeof issue === "string" ? issue.slice(0, 160) : "";
  const [known] = issueEmail
    ? await sql`
        SELECT business_name, contact_name, phone, tin, address_line, city, state, postal_code, country
        FROM leads WHERE lower(email) = ${issueEmail.trim().toLowerCase()} LIMIT 1`
    : [];
  const pending = await sql`
    SELECT c.id, c.method, c.reference, c.sender_name, c.created_at,
           i.invoice_no, i.total, l.email
    FROM payment_claims c
    JOIN invoices i ON i.id = c.invoice_id
    JOIN leads l ON l.id = i.lead_id
    WHERE c.status = 'pending'
    ORDER BY c.created_at`;
  const recent = await sql`
    SELECT c.method, c.reference, c.status, c.reviewed_at, c.amount_received, i.invoice_no, i.total, l.email
    FROM payment_claims c
    JOIN invoices i ON i.id = c.invoice_id
    JOIN leads l ON l.id = i.lead_id
    WHERE c.status <> 'pending'
    ORDER BY c.reviewed_at DESC NULLS LAST LIMIT 20`;

  const issued = await sql`
    SELECT i.id, i.invoice_no, i.total, i.status, i.created_at, l.email, l.business_name
    FROM invoices i JOIN leads l ON l.id = i.lead_id
    ORDER BY i.created_at DESC LIMIT 30`;
  const registered = await sql`
    SELECT email, business_name, contact_name, phone, address_line, city, state, postal_code, country, tin, services, service_notes, registered_at
    FROM leads WHERE registered_at IS NOT NULL
    ORDER BY registered_at DESC LIMIT 30`;
  const statusLabel = (s: string) => (s === "paid" ? "Paid" : s === "void" ? "Void" : "Unpaid");

  const fmt = (d: string) => new Date(d).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Service invoices &amp; payments</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/finance" className="rounded-lg bg-moss px-3 py-1.5 font-semibold text-white hover:bg-moss-dark">Finance &amp; reports</Link>
        <a href="/api/admin/export?type=sales" className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:bg-paper">Export sales register (CSV)</a>
        <a href="/api/admin/export?type=receivables" className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:bg-paper">Export receivables (CSV)</a>
      </div>

      <section id="issue" className="mt-6 scroll-mt-6 rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Issue a service invoice</h2>
        <p className="mt-1 mb-4 text-sm text-ink/70">
          A customer sees an invoice only after you issue one here. Without one, they get a &ldquo;no invoice issued at this time&rdquo; message
          after entering their email. An issued invoice&apos;s amount never changes; to correct a mistake, void it and issue a new one.
          For paid invoices, <strong>Email receipt + PDF</strong> downloads the receipt as a PDF marked PAID and opens a Gmail draft; attach the PDF, review, and press Send yourself.
        </p>
        <IssueInvoiceForm key={issueEmail} defaultTotalPHP={currentTotalCentavos() / 100} defaultEmail={issueEmail}
          defaultBilling={known ? {
            businessName: known.business_name ?? "", contactName: known.contact_name ?? "", phone: known.phone ?? "",
            tin: known.tin ?? "", addressLine: known.address_line ?? "", city: known.city ?? "", state: known.state ?? "",
            postalCode: known.postal_code ?? "", country: known.country ?? "",
          } : undefined} />
      </section>


      <h2 className="mt-10 text-lg font-bold">Registered businesses</h2>
      <p className="mt-2 text-sm text-ink/70">
        Customers who registered at <span className="font-mono">/register</span>. Their details print under &ldquo;Bill to&rdquo; on their invoices and receipts.
        Use <strong>Issue invoice</strong> to prefill the form above.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-2.5">Business</th>
              <th className="px-4 py-2.5">Contact</th>
              <th className="px-4 py-2.5">Address</th>
              <th className="px-4 py-2.5">Registered</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {registered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink/60">No registrations yet.</td></tr>
            )}
            {registered.map((r) => (
              <tr key={r.email} className="align-top">
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{r.business_name}</p>
                  {r.tin && <p className="text-xs text-ink/60">TIN: {r.tin}</p>}
                  {Array.isArray(r.services) && r.services.length > 0 && (
                    <p className="mt-1 text-xs text-moss">Autopay: {(r.services as string[]).join(", ")}</p>
                  )}
                  {r.service_notes && <p className="text-xs text-ink/60">Notes: {r.service_notes}</p>}
                </td>
                <td className="px-4 py-2.5">
                  <p>{r.contact_name}</p>
                  <p className="text-xs text-ink/60">{r.email}</p>
                  {r.phone && <p className="text-xs text-ink/60">{r.phone}</p>}
                </td>
                <td className="px-4 py-2.5 text-ink/80">
                  {addressLines(r).map((l: string) => (<p key={l}>{l}</p>))}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{fmt(r.registered_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/admin?issue=${encodeURIComponent(r.email)}#issue`}
                    className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold hover:bg-paper"
                  >
                    Issue invoice
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-bold">Payments to confirm</h2>
      <p className="mt-2 text-sm text-ink/70">
        Pending references are shown in full so you can match them; reviewed ones are masked. For each row, find the matching transfer in your GCash or bank history (same reference, same amount) before
        confirming. Confirming asks for the amount you received, marks the service invoice paid and emails the customer their receipt.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-3">Service invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount expected</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Sent by</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pending.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ink/60">Nothing waiting for confirmation.</td></tr>
            )}
            {pending.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{invoiceNumber(c.invoice_no)}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3 font-semibold">{formatPHP(c.total)}</td>
                <td className="px-4 py-3">{methodLabel(c.method)}</td>
                <td className="px-4 py-3 font-mono">{c.reference}</td>
                <td className="px-4 py-3">{c.sender_name || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmt(c.created_at)}</td>
                <td className="px-4 py-3"><ReviewButtons claimId={c.id} expectedPHP={c.total / 100} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-bold">Recently reviewed</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-2.5">Service invoice</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Expected</th>
              <th className="px-4 py-2.5">Received</th>
              <th className="px-4 py-2.5">Method</th>
              <th className="px-4 py-2.5">Reference</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recent.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-ink/60">No reviewed payments yet.</td></tr>
            )}
            {recent.map((c, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-semibold">{invoiceNumber(c.invoice_no)}</td>
                <td className="px-4 py-2.5">{c.email}</td>
                <td className="px-4 py-2.5">{formatPHP(c.total)}</td>
                <td className="px-4 py-2.5">{c.amount_received != null ? formatPHP(c.amount_received) : "—"}</td>
                <td className="px-4 py-2.5">{methodLabel(c.method)}</td>
                <td className="px-4 py-2.5 font-mono">{maskTail(c.reference)}</td>
                <td className="px-4 py-2.5 capitalize">{c.status}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{c.reviewed_at ? fmt(c.reviewed_at) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-bold">Issued service invoices</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink/60">
            <tr>
              <th className="px-4 py-2.5">Service invoice</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Amount</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Issued</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {issued.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/60">No invoices issued yet.</td></tr>
            )}
            {issued.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-semibold">
                  <Link href={`/invoice/${r.id}`} className="text-moss underline" target="_blank">{invoiceNumber(r.invoice_no)}</Link>
                </td>
                <td className="px-4 py-2.5">
                  {r.business_name && <p className="font-semibold">{r.business_name}</p>}
                  <p className={r.business_name ? "text-xs text-ink/60" : ""}>{r.email}</p>
                </td>
                <td className="px-4 py-2.5">{formatPHP(r.total)}</td>
                <td className="px-4 py-2.5">{statusLabel(r.status)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{fmt(r.created_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.status === "pending" && <VoidButton invoiceId={r.id} label={invoiceNumber(r.invoice_no)} />}
                  {r.status === "paid" && (
                    <EmailReceiptButton
                      invoiceId={r.id}
                      email={r.email}
                      label={invoiceNumber(r.invoice_no)}
                      amountLabel={formatPHP(r.total)}
                      link={`${brand.url}/invoice/${r.id}`}
                      pdfLink={`${brand.url}/api/invoice/${r.id}/pdf`}
                      businessName={brand.name}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
