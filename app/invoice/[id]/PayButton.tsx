"use client";

import { useState } from "react";

export default function PayButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={busy}
        className="w-full rounded-lg bg-moss px-4 py-3 font-semibold text-white transition hover:bg-moss-dark
                   disabled:cursor-not-allowed disabled:opacity-80
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
