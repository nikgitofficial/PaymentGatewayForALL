"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PayMethod } from "@/lib/paymentinfo";

type Props = {
  invoiceId: string;
  invoiceLabel: string; // e.g. "INV-004"
  amountLabel: string; // e.g. "₱560.00"
  email: string;
  methods: PayMethod[];
  contactEmail: string;
  initialClaim: "pending" | "rejected" | null;
};

type View = "idle" | "form" | "waiting" | "rejected";

export default function PaymentPanel({ invoiceId, invoiceLabel, amountLabel, email, methods, contactEmail, initialClaim }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialClaim === "pending" ? "waiting" : initialClaim === "rejected" ? "rejected" : "idle");
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "gcash");
  const [reference, setReference] = useState("");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const method = methods.find((m) => m.id === methodId) ?? methods[0];

  // While waiting, poll for the owner's confirmation.
  useEffect(() => {
    if (view !== "waiting") return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/status?invoiceId=${invoiceId}`, { cache: "no-store" });
        const d = await res.json();
        if (stop) return;
        if (d.invoiceStatus === "paid") router.refresh();
        else if (d.claimStatus === "rejected") setView("rejected");
      } catch {}
    };
    const t = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [view, invoiceId, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, method: methodId, reference, senderName: sender || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Something went wrong.");
      setView("waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const primary =
    "w-full rounded-lg bg-moss px-4 py-3 font-semibold text-white transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-80 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

  if (!methods.length) {
    return (
      <p className="rounded-lg bg-paper px-4 py-3 text-center text-sm text-ink/70">
        Payment details aren&apos;t set up yet.{contactEmail ? ` Please contact ${contactEmail}.` : ""}
      </p>
    );
  }

  if (view === "idle") {
    return <button onClick={() => setView("form")} className={primary}>Pay {amountLabel}</button>;
  }

  if (view === "waiting") {
    const steps = [
      { title: "Reference received", sub: "We have your reference number.", state: "done" },
      { title: "Checking our GCash / bank records", sub: "We match your reference and amount against our transfer history.", state: "active" },
      { title: "Payment confirmed", sub: `Your receipt will be emailed to ${email}.`, state: "todo" },
    ] as const;
    return (
      <div aria-live="polite">
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.title} className="flex gap-3">
              <span
                className={
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold " +
                  (s.state === "done" ? "bg-moss text-white" : s.state === "active" ? "border-2 border-moss text-moss animate-pulse" : "border-2 border-line text-ink/30")
                }
              >
                {s.state === "done" ? "✓" : ""}
              </span>
              <div>
                <p className={"font-semibold " + (s.state === "todo" ? "text-ink/40" : "")}>{s.title}</p>
                <p className={"text-sm " + (s.state === "todo" ? "text-ink/30" : "text-ink/60")}>{s.sub}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-ink/50">
          This can take a little while. You can leave this page and come back to it with the same link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {view === "rejected" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          We couldn&apos;t match that reference to a payment. Please check the number and amount and submit it again
          {contactEmail ? `, or contact ${contactEmail}` : ""}.
        </p>
      )}

      {methods.length > 1 && (
        <div className="grid grid-cols-2 gap-2" role="tablist">
          {methods.map((m) => (
            <button
              type="button" key={m.id} role="tab" aria-selected={m.id === methodId}
              onClick={() => setMethodId(m.id)}
              className={
                "rounded-lg border px-3 py-2 text-sm font-semibold transition " +
                (m.id === methodId ? "border-moss bg-moss/10 text-moss" : "border-line bg-white hover:bg-paper")
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-line bg-paper p-4 text-sm">
        <p className="font-semibold">1. Send exactly {amountLabel} to:</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {method.lines.map((l) => (
            <div key={l.k} className="contents">
              <dt className="text-ink/60">{l.k}</dt>
              <dd className="font-semibold">{l.v}</dd>
            </div>
          ))}
          <dt className="text-ink/60">Message / note</dt>
          <dd className="font-semibold">{invoiceLabel}</dd>
        </dl>
      </div>

      <div>
        <label htmlFor="ref" className="block text-sm font-semibold">2. {method.refLabel}</label>
        <input
          id="ref" required disabled={busy} value={reference}
          onChange={(e) => setReference(e.target.value.replace(/\s/g, ""))}
          autoComplete="off" inputMode="text" maxLength={40}
          placeholder="e.g. 1234567890123"
          className="mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 font-mono outline-none focus:border-moss focus:ring-2 focus:ring-moss/30 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-ink/60">{method.refHint}</p>
      </div>

      <div>
        <label htmlFor="sender" className="block text-sm font-semibold">Name on the sending account <span className="font-normal text-ink/50">(optional)</span></label>
        <input
          id="sender" disabled={busy} value={sender} onChange={(e) => setSender(e.target.value)} maxLength={80}
          className="mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 outline-none focus:border-moss focus:ring-2 focus:ring-moss/30 disabled:opacity-60"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className={primary}>{busy ? "Submitting…" : "Submit reference"}</button>
    </form>
  );
}
