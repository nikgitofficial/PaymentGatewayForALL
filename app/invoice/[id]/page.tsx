import { notFound } from "next/navigation";
import { getInvoiceSynced } from "@/lib/invoice-db";
import { formatPHP, invoiceNumber, splitTotals, type InvoiceItem } from "@/lib/invoice";
import { brand } from "@/lib/brand";
import PayButton from "./PayButton";
import PrintButtons from "./PrintButtons";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const inv = await getInvoiceSynced(id);
  if (!inv) notFound();

  const items = inv.items as InvoiceItem[];
  const { subtotal, tax, taxLabel } = splitTotals(items);
  const paid = inv.status === "paid";
  const date = new Date(inv.created_at).toLocaleDateString("en-PH", { dateStyle: "long" });

  return (
    <main className="min-h-screen grid place-items-center px-5 py-10 print:block print:p-0">
      <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 flex justify-end">
          <PrintButtons fileName={`${invoiceNumber(inv.invoice_no)}-${paid ? "receipt" : "invoice"}`} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{paid ? "Receipt" : "Invoice"}</h1>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-semibold">Invoice number</dt>
              <dd>{invoiceNumber(inv.invoice_no)}</dd>
              <dt className="font-semibold">{paid ? "Date paid" : "Date issued"}</dt>
              <dd>{date}</dd>
            </dl>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={brand.name} className="h-16 w-auto" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold">{brand.name}</p>
            {brand.address && <p className="text-ink/70">{brand.address}</p>}
            {brand.email && <p className="text-ink/70">{brand.email}</p>}
          </div>
          <div>
            <p className="font-semibold">Bill to</p>
            <p className="text-ink/70">{inv.email}</p>
          </div>
        </div>

        <p className="mt-8 text-xl font-bold">
          {formatPHP(inv.total)} {paid ? "paid" : "due"}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-ink/70 text-left text-xs">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.filter((i) => i.kind !== "tax").map((item) => (
              <tr key={item.name} className="border-b border-line align-top">
                <td className="py-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-ink/60">{item.description}</p>
                  {item.details && item.details.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-ink/60">
                      {item.details.map((d) => (
                        <li key={d}>• {d}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 text-right">{formatPHP(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {tax > 0 && (
              <>
                <tr>
                  <td className="pt-3 text-right text-ink/70">Subtotal</td>
                  <td className="pt-3 text-right">{formatPHP(subtotal)}</td>
                </tr>
                <tr>
                  <td className="pt-1 text-right text-ink/70">{taxLabel}</td>
                  <td className="pt-1 text-right">{formatPHP(tax)}</td>
                </tr>
              </>
            )}
            <tr>
              <td className="pt-4 text-right font-bold">{paid ? "Amount paid" : "Total due"}</td>
              <td className="pt-4 text-right text-lg font-bold">{formatPHP(inv.total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 print:hidden">
          {paid ? (
            <p className="text-center text-ink/70">This invoice has been paid. Thank you.</p>
          ) : (
            <PayButton invoiceId={inv.id} label={`Pay ${formatPHP(inv.total)}`} />
          )}
        </div>
        <p className="mt-4 text-xs text-ink/50">
          Payments are processed by PayMongo. GCash, Maya, QR Ph and cards accepted.
        </p>
      </div>
    </main>
  );
}
