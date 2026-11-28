"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VoidButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!window.confirm(`Void ${label}? The customer will no longer be able to pay it. This can't be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", invoiceId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run} disabled={busy}
        className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold hover:bg-paper disabled:opacity-60"
      >
        {busy ? "…" : "Void"}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
