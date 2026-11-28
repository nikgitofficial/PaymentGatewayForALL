"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Billing = {
  businessName: string; contactName: string; phone: string; tin: string;
  addressLine: string; city: string; state: string; postalCode: string; country: string;
};
const emptyBilling: Billing = { businessName: "", contactName: "", phone: "", tin: "", addressLine: "", city: "", state: "", postalCode: "", country: "" };

export default function IssueInvoiceForm({
  defaultTotalPHP, defaultEmail = "", defaultBilling,
}: { defaultTotalPHP: number; defaultEmail?: string; defaultBilling?: Partial<Billing> }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [total, setTotal] = useState(String(defaultTotalPHP));
  const [b, setB] = useState<Billing>({ ...emptyBilling, ...defaultBilling });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const hasBilling = Object.values(b).some((v) => v.trim());
  const setField = (k: keyof Billing, v: string) => setB((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    const totalPHP = Number(total.replace(/[, ₱]/g, ""));
    if (!Number.isFinite(totalPHP) || totalPHP <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!window.confirm(`Issue a service invoice of ₱${totalPHP.toLocaleString("en-PH", { minimumFractionDigits: 2 })} to ${email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue", email, totalPHP, billing: hasBilling ? b : undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed.");
      setDone(`Invoice issued to ${email}. They'll see it after entering their email.`);
      setEmail("");
      setB(emptyBilling);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/30 disabled:opacity-60";
  const lbl = "block text-sm font-semibold";
  const bf = (id: keyof Billing, label: string, ph = "", span = "") => (
    <div className={span}>
      <label htmlFor={`bill-${id}`} className={lbl}>{label}</label>
      <input id={`bill-${id}`} disabled={busy} value={b[id]} onChange={(e) => setField(id, e.target.value)} placeholder={ph} className={input} />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <div>
        <label htmlFor="inv-email" className={lbl}>Customer email</label>
        <input
          id="inv-email" type="email" required disabled={busy} value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="customer@company.com" className={input}
        />
      </div>
      <div>
        <label htmlFor="inv-total" className={lbl}>Total amount (PHP, VAT included)</label>
        <input
          id="inv-total" required disabled={busy} inputMode="decimal" value={total}
          onChange={(e) => setTotal(e.target.value)} className={input + " font-mono"}
        />
      </div>
      <button
        type="submit" disabled={busy}
        className="rounded-lg bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss-dark disabled:opacity-60"
      >
        {busy ? "Issuing…" : "Issue invoice"}
      </button>

      <details open={hasBilling} className="rounded-lg border border-line bg-paper px-4 py-3 sm:col-span-3">
        <summary className="cursor-pointer text-sm font-semibold">Bill to details (business name, address, TIN)</summary>
        <p className="mt-2 text-xs text-ink/60">
          Printed under &ldquo;Bill to&rdquo; on the invoice and receipt. Leave a field blank to keep what is already on file for this email.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {bf("businessName", "Business name", "Acme Trading Co.", "sm:col-span-2")}
          {bf("contactName", "Contact person", "Juan Dela Cruz")}
          {bf("phone", "Phone")}
          {bf("tin", "TIN", "123-456-789-000", "sm:col-span-2")}
          {bf("addressLine", "Street address", "Unit, building, street", "sm:col-span-2")}
          {bf("city", "City")}
          {bf("state", "State / Province")}
          {bf("postalCode", "Postal code")}
          {bf("country", "Country", "Philippines")}
        </div>
      </details>

      {(error || done) && (
        <p role={error ? "alert" : "status"} className={"text-sm sm:col-span-3 " + (error ? "text-red-700" : "text-moss")}>
          {error || done}
        </p>
      )}
    </form>
  );
}
