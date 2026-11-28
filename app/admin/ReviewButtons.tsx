"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ claimId, expectedPHP }: { claimId: string; expectedPHP: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "confirm" | "reject">("");
  const [error, setError] = useState("");

  async function act(action: "confirm" | "reject") {
    let amountReceivedPHP: number | undefined;
    if (action === "confirm") {
      const answer = window.prompt(
        "Amount you actually received in your GCash / bank account (PHP).\nIt must be at least the invoice total.",
        String(expectedPHP)
      );
      if (answer === null) return;
      amountReceivedPHP = Number(answer.replace(/[, ₱]/g, ""));
      if (!Number.isFinite(amountReceivedPHP) || amountReceivedPHP <= 0) {
        setError("Enter a valid amount.");
        return;
      }
    }
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action, amountReceivedPHP }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
      setBusy("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => act("confirm")} disabled={!!busy}
        className="rounded-lg bg-moss px-3 py-1.5 text-sm font-semibold text-white hover:bg-moss-dark disabled:opacity-60"
      >
        {busy === "confirm" ? "Confirming…" : "Confirm received"}
      </button>
      <button
        onClick={() => act("reject")} disabled={!!busy}
        className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-60"
      >
        {busy === "reject" ? "…" : "Reject"}
      </button>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
