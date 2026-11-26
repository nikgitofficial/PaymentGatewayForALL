"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "idle" | "verifying" | "verified" | "preparing";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setStep("verifying");
      const request = fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
        return data as { invoiceId: string };
      });
      const [{ invoiceId }] = await Promise.all([request, wait(1800)]); // fake verification delay
      setStep("verified");
      await wait(1200);
      setStep("preparing");
      router.push(`/invoice/${invoiceId}`);
    } catch (err) {
      setStep("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const busy = step !== "idle";
  const label = {
    idle: "View my invoice",
    verifying: "Verifying your email…",
    verified: "Email verified",
    preparing: "Preparing your invoice…",
  }[step];

  return (
    <main className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
          Enter your email to view your invoice
        </h1>
        <p className="mt-3 text-ink/70">
          We’ll confirm your email, then show your monthly invoice before checkout.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label htmlFor="email" className="block text-sm font-semibold">Email address</label>
          <input
            id="email" type="email" required disabled={busy}
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base outline-none
                       focus:border-moss focus:ring-2 focus:ring-moss/30 disabled:opacity-60"
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-moss px-4 py-3 font-semibold text-white transition
                       hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-80
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            {step === "verified" ? "✓ " : ""}{label}
          </button>
        </form>
      </div>
    </main>
  );
}
