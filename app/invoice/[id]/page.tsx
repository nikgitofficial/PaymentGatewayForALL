import { notFound } from "next/navigation";
import { getInvoiceSynced } from "@/lib/invoice-db";
import { formatPHP, invoiceNumber, type InvoiceItem } from "@/lib/invoice";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const inv = await getInvoiceSynced(id);
  if (!inv) notFound();

  const items = inv.items as InvoiceItem[];
  const paid = inv.status === "paid";
  const date = new Date(inv.created_at).toLocaleDateString("en-PH", { dateStyle: "long" });

  return (
    <main className="min-h-screen grid place-items-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Invoice</h1>
            <p className="mt-1 text-sm text-ink/60">{invoiceNumber(inv.invoice_no)} · {date}</p>
          </div>
          {paid && (
            <span className="rounded-full bg-moss px-3 py-1 text-sm font-semibold text-white">Paid</span>
          )}
        </div>

        <p className="mt-6 text-sm text-ink/60">Billed to</p>
        <p className="font-semibold">{inv.email}</p>

        <div className="mt-6 rounded-xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.name} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-ink/60">{item.description}</p>
                </div>
                <p className="whitespace-nowrap font-semibold">{formatPHP(item.amount)}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <p className="font-bold">Total due</p>
            <p className="text-2xl font-extrabold">{formatPHP(inv.total)}</p>
          </div>
        </div>

        <div className="mt-6">
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
