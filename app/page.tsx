"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "idle" | "verifying" | "verified" | "preparing";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NAVY = "#0b2559";
const GREEN = "#00b386";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  // Set when the email was accepted but the owner has not issued an invoice for it yet.
  const [notice, setNotice] = useState<{ latestId: string | null; contactEmail: string | null; dashboardId: string | null } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice(null);
    try {
      setStep("verifying");
      const request = fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) return { notFound: true as const, contactEmail: (data.contactEmail ?? null) as string | null };
        if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
        return { notFound: false as const, contactEmail: null as string | null };
      });
      const [data] = await Promise.all([request, wait(900)]); // short pause so the steps are readable
      if (data.notFound) {
        setStep("idle");
        setNotice({ contactEmail: data.contactEmail });
        return;
      }
      setStep("verified");
      await wait(600);
      setStep("preparing");
      router.push("/dashboard");
    } catch (err) {
      setStep("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const busy = step !== "idle";
  const label = {
    idle: "Log in to my dashboard",
    verifying: "Checking your email…",
    verified: "Signed in",
    preparing: "Opening your dashboard…",
  }[step];

  return (
    <main className="grid min-h-screen overflow-x-clip lg:grid-cols-[1.1fr_1fr]">
      <style>{`
        @keyframes pg-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes pg-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes pg-spin { to { transform: rotate(360deg) } }
        .pg-float { animation: pg-float 7s ease-in-out infinite }
        .pg-float-2 { animation: pg-float 9s ease-in-out -3s infinite }
        .pg-rise { animation: pg-rise .7s cubic-bezier(.2,.7,.2,1) both }
        .pg-spin { animation: pg-spin 60s linear infinite }
        @media (prefers-reduced-motion: reduce) { .pg-float,.pg-float-2,.pg-rise,.pg-spin { animation: none } }
      `}</style>

      {/* ───────── Brand panel ───────── */}
      <section
        className="relative isolate overflow-hidden px-8 py-10 text-white lg:px-14 lg:py-14"
        style={{ background: `radial-gradient(120% 90% at 0% 0%, #14398a 0%, ${NAVY} 45%, #061638 100%)` }}
      >
        {/* glow blobs */}
        <div aria-hidden className="absolute -left-24 top-1/3 -z-10 h-80 w-80 rounded-full blur-3xl" style={{ background: `${GREEN}55` }} />
        <div aria-hidden className="absolute -bottom-32 right-0 -z-10 h-96 w-96 rounded-full blur-3xl" style={{ background: "#3b82f666" }} />
        {/* dotted grid */}
        <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.12]">
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Payment Gateway for All"
          className="pg-rise h-14 w-auto rounded-2xl bg-white px-4 py-2 shadow-xl shadow-black/20 lg:h-16"
        />

        <div className="mt-10 max-w-lg lg:mt-16">
          <p className="pg-rise text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: GREEN, animationDelay: ".05s" }}>
            Secure · Simple · For everyone
          </p>
          <h2 className="pg-rise mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight lg:text-6xl" style={{ animationDelay: ".1s" }}>
            Pay your service invoice in{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${GREEN}, #7cf5d0)` }}>
              seconds.
            </span>
          </h2>
          <p className="pg-rise mt-5 text-lg text-white/70" style={{ animationDelay: ".15s" }}>
            Pay by GCash or bank transfer, enter your reference number, and get your receipt by email once it's confirmed.
          </p>

          {/* purpose of the service */}
          <div
            className="pg-rise mt-8 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur"
            style={{ animationDelay: ".2s" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: GREEN }}>
              What this service is for
            </h3>
            <p className="mt-2 leading-relaxed text-white/80">
              Paying for each web service separately, such as hosting, databases, AI tools and APIs, takes time and
              many different payments. <strong className="text-white">Payment Gateway for All</strong> automates your
              service payments in one place: we handle those services for you, and you settle a single invoice.
            </p>
            <ol className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
              {[
                ["1", "Enter your business email"],
                ["2", "Open your service invoice"],
                ["3", "Pay once and get your receipt"],
              ].map(([n, t]) => (
                <li key={n} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: GREEN }}
                  >
                    {n}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* illustration */}
        <div className="relative mx-auto mt-12 hidden h-72 max-w-lg lg:block" aria-hidden>
          <svg className="pg-spin absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 opacity-30" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="98" stroke="#fff" strokeWidth=".5" strokeDasharray="2 6" />
            <circle cx="100" cy="100" r="70" stroke={GREEN} strokeWidth=".5" strokeDasharray="1 5" />
          </svg>

          {/* card */}
          <div className="pg-float absolute left-2 top-6 w-64 rotate-[-6deg] rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="h-7 w-10 rounded-md" style={{ background: `linear-gradient(135deg, ${GREEN}, #7cf5d0)` }} />
              <svg width="28" height="18" viewBox="0 0 28 18"><circle cx="9" cy="9" r="9" fill="#fff" fillOpacity=".55" /><circle cx="19" cy="9" r="9" fill="#fff" fillOpacity=".3" /></svg>
            </div>
            <div className="mt-7 flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full bg-white/50" />
              ))}
            </div>
            <div className="mt-4 h-2 w-24 rounded-full bg-white/30" />
          </div>

          {/* shield */}
          <div
            className="pg-float-2 absolute right-4 top-0 grid h-28 w-28 place-items-center rounded-3xl shadow-2xl shadow-black/30"
            style={{ background: `linear-gradient(145deg, ${GREEN}, #008f6b)` }}
          >
            <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />
              <path d="m8.8 12 2.4 2.4 4.2-4.6" />
            </svg>
          </div>

          {/* receipt */}
          <div className="pg-float absolute bottom-0 right-10 w-56 rounded-2xl border border-white/20 bg-white/95 p-4 text-slate-800 shadow-2xl shadow-black/30" style={{ animationDelay: "-2s" }}>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: GREEN }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              <span className="text-sm font-bold">Payment received</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-slate-200" />
              <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
              <div className="h-1.5 w-3/5 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>

        {/* feature chips */}
        <ul className="relative mt-10 flex flex-wrap gap-3 text-sm lg:mt-8">
          {["GCash & bank transfer", "Email receipts", "Print or save as PDF"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── Form panel ───────── */}
      <section className="relative grid place-items-center overflow-hidden bg-[#f6f8fb] px-6 py-14">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full blur-3xl"
          style={{ background: `${GREEN}22` }}
        />
        <div className="pg-rise relative w-full max-w-md rounded-3xl border border-white bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(11,37,89,.35)] backdrop-blur sm:p-10">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: `${GREEN}1f`, color: "#008f6b" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
            Secure portal
          </span>

          {notice ? (
            <div className="mt-6" role="status" aria-live="polite">
              <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: `${GREEN}1f` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#008f6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight" style={{ color: NAVY }}>
                No account found
              </h1>
              <p className="mt-3 text-slate-500">
                We couldn&apos;t find a registered account for{" "}
                <span className="break-all font-semibold text-slate-700">{email}</span>. Register your business first, then log in with the same email
                {notice.contactEmail ? (
                  <>
                    {" "}or contact{" "}
                    <a href={`mailto:${notice.contactEmail}`} className="font-semibold underline" style={{ color: "#008f6b" }}>
                      {notice.contactEmail}
                    </a>
                  </>
                ) : null}
                .
              </p>
              <div className="mt-8 space-y-3">
                <Link
                  href="/register"
                  className="flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#00b386]/25 transition hover:brightness-105"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
                >
                  Register your business
                </Link>
                <button
                  type="button"
                  onClick={() => { setNotice(null); setEmail(""); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-semibold transition hover:bg-slate-50"
                  style={{ color: NAVY }}
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
          <>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight" style={{ color: NAVY }}>
            Welcome to Payment
          </h1>
          <p className="mt-2 text-slate-500">Please enter your business email address.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label htmlFor="email" className="block text-sm font-semibold" style={{ color: NAVY }}>
              Business email address
            </label>
            <div className="relative">
              <svg
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              <input
                id="email" type="email" required disabled={busy} autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 outline-none transition
                           placeholder:text-slate-400 focus:border-[#00b386] focus:ring-4 focus:ring-[#00b386]/20 disabled:opacity-60"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit" disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#00b386]/25 transition
                         hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-80
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b386]"
              style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
            >
              {step === "verified" ? "✓ " : ""}{label}
              {!busy && (
                <svg className="transition group-hover:translate-x-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Your service invoice appears here once it has been issued to you
          </p>

          <p className="mt-5 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            New customer?{" "}
            <Link href="/register" className="font-semibold underline underline-offset-4" style={{ color: "#008f6b" }}>
              Register your business
            </Link>
          </p>
          </>
          )}
        </div>
      </section>
    </main>
  );
}
