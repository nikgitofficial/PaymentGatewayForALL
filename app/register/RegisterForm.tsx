"use client";

import Link from "next/link";
import { useState } from "react";
import { COUNTRIES } from "@/lib/customer";
import { SERVICE_OPTIONS } from "@/lib/services";

const NAVY = "#0b2559";
const GREEN = "#00b386";

type Values = {
  businessName: string;
  tin: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryOther: string;
  services: string[];
  serviceNotes: string;
  consent: boolean;
  website: string; // honeypot
};

const empty: Values = {
  businessName: "", tin: "", contactName: "", email: "", phone: "", addressLine: "",
  city: "", state: "", postalCode: "", country: "Philippines", countryOther: "", services: [], serviceNotes: "", consent: false, website: "",
};

type Errors = Partial<Record<keyof Values, string>>;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.businessName.trim().length < 2) e.businessName = "Enter your business name.";
  if (v.contactName.trim().length < 2) e.contactName = "Enter the contact person's name.";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (v.phone.trim() && !/^[0-9+()\-\s.]{7,30}$/.test(v.phone.trim())) e.phone = "Enter a valid phone number.";
  if (v.tin.trim() && !/^[0-9A-Za-z][0-9A-Za-z\- ]*$/.test(v.tin.trim())) e.tin = "Use letters, numbers and dashes only.";
  if (v.addressLine.trim().length < 3) e.addressLine = "Enter your street address.";
  if (v.city.trim().length < 2) e.city = "Enter your city.";
  if (v.state.trim().length < 2) e.state = "Enter your state or province.";
  if (!/^[0-9A-Za-z][0-9A-Za-z\- ]{1,19}$/.test(v.postalCode.trim())) e.postalCode = "Enter a valid postal code.";
  if (v.country === "Other" && v.countryOther.trim().length < 2) e.countryOther = "Enter your country.";
  if (v.services.length === 0) e.services = "Choose at least one service.";
  if (!v.consent) e.consent = "Please confirm to continue.";
  return e;
}

export default function RegisterForm({ contactEmail }: { contactEmail: string }) {
  const [v, setV] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; email: string; leadId: string | null } | null>(null);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: v.businessName,
          tin: v.tin,
          contactName: v.contactName,
          email: v.email,
          phone: v.phone,
          addressLine: v.addressLine,
          city: v.city,
          state: v.state,
          postalCode: v.postalCode,
          country: v.country === "Other" ? v.countryOther : v.country,
          services: v.services,
          serviceNotes: v.serviceNotes,
          consent: v.consent,
          website: v.website,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.fields) {
          const mapped: Errors = {};
          for (const [k, msg] of Object.entries(d.fields)) {
            const key = (k === "country" && v.country === "Other" ? "countryOther" : k) as keyof Values;
            mapped[key] = String(msg);
          }
          setErrors(mapped);
        }
        throw new Error(d.error ?? "Something went wrong.");
      }
      setDone({ name: v.businessName.trim(), email: v.email.trim().toLowerCase(), leadId: d.leadId ?? null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[0.85fr_1.15fr]">
      <style>{`
        @keyframes rg-rise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
        .rg-rise { animation: rg-rise .6s cubic-bezier(.2,.7,.2,1) both }
        @media (prefers-reduced-motion: reduce) { .rg-rise { animation: none } }
      `}</style>

      {/* ───────── Brand panel ───────── */}
      <aside
        className="relative isolate overflow-hidden px-8 py-10 text-white lg:sticky lg:top-0 lg:h-screen lg:px-12 lg:py-14"
        style={{ background: `radial-gradient(120% 90% at 0% 0%, #14398a 0%, ${NAVY} 45%, #061638 100%)` }}
      >
        <div aria-hidden className="absolute -left-24 top-1/3 -z-10 h-80 w-80 rounded-full blur-3xl" style={{ background: `${GREEN}55` }} />
        <div aria-hidden className="absolute -bottom-32 right-0 -z-10 h-96 w-96 rounded-full blur-3xl" style={{ background: "#3b82f666" }} />
        <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.12]">
          <defs>
            <pattern id="rg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.4" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rg-dots)" />
        </svg>

        <div className="flex h-full flex-col">
          <Link href="/" aria-label="Back to start" className="self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Payment Gateway for All"
              className="rg-rise h-14 w-auto rounded-2xl bg-white px-4 py-2 shadow-xl shadow-black/20 lg:h-16"
            />
          </Link>

          <div className="mt-10 max-w-md lg:mt-16">
            <p className="rg-rise text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: GREEN, animationDelay: ".05s" }}>
              Customer registration
            </p>
            <h1 className="rg-rise mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight lg:text-5xl" style={{ animationDelay: ".1s" }}>
              Register your{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${GREEN}, #7cf5d0)` }}>
                business.
              </span>
            </h1>
            <p className="rg-rise mt-5 text-lg text-white/70" style={{ animationDelay: ".15s" }}>
              Tell us who to bill. Your business details appear on every service invoice and receipt we issue to you.
            </p>

            <ul className="rg-rise mt-8 space-y-4" style={{ animationDelay: ".2s" }}>
              {[
                ["One place for your service payments", "Instead of paying each web service separately, settle a single invoice."],
                ["Professional invoices & receipts", "Your business name, address and TIN, ready for your records."],
                ["Simple payment", "Pay by GCash or bank transfer and get your receipt by email."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: GREEN }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="block text-sm text-white/65">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 text-sm text-white/60 lg:mt-auto">
            Already registered?{" "}
            <Link href="/" className="font-semibold text-white underline underline-offset-4">
              View your service invoice
            </Link>
            {contactEmail ? (
              <>
                <br />
                Need help? <a href={`mailto:${contactEmail}`} className="font-semibold text-white underline underline-offset-4">{contactEmail}</a>
              </>
            ) : null}
          </p>
        </div>
      </aside>

      {/* ───────── Form panel ───────── */}
      <section className="relative overflow-hidden bg-[#f6f8fb] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div
          aria-hidden
          className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full blur-3xl"
          style={{ background: `${GREEN}22` }}
        />
        <div className="rg-rise relative mx-auto w-full max-w-2xl rounded-3xl border border-white bg-white/85 p-6 shadow-[0_30px_80px_-30px_rgba(11,37,89,.35)] backdrop-blur sm:p-10">
          {done ? (
            <div role="status" aria-live="polite">
              <div className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: `${GREEN}1f` }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#008f6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12 5 5 9-10" />
                </svg>
              </div>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight" style={{ color: NAVY }}>
                Registration received
              </h2>
              <p className="mt-3 text-slate-500">
                Thank you. <span className="font-semibold text-slate-700">{done.name}</span> is now registered with{" "}
                <span className="font-semibold text-slate-700 [overflow-wrap:anywhere]">{done.email}</span>.
              </p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold" style={{ color: NAVY }}>What happens next</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-600">
                  <li>1. We review your details and issue your service invoice.</li>
                  <li>2. Log in with your email to view and pay it.</li>
                  <li>3. After we confirm your payment, your receipt is emailed to you.</li>
                </ol>
              </div>
              {done.leadId && (
                <Link
                  href="/dashboard"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#00b386]/25 transition hover:brightness-105"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
                >
                  Open my dashboard
                </Link>
              )}
              <Link
                href="/"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#00b386]/25 transition hover:brightness-105"
                style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
              >
                Go to my service invoice
              </Link>
            </div>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: `${GREEN}1f`, color: "#008f6b" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
                Secure registration
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight" style={{ color: NAVY }}>
                Business details
              </h2>
              <p className="mt-2 text-slate-500">Fields marked <span className="text-red-600">*</span> are required.</p>

              <form onSubmit={onSubmit} noValidate className="mt-8 space-y-9">
                {/* honeypot (hidden from people) */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website", e.target.value)} />
                  </label>
                </div>

                <Section n="1" title="Your business">
                  <Field id="businessName" label="Business name" required error={errors.businessName} className="sm:col-span-2">
                    <input {...inp("businessName", v, set, errors, busy)} autoComplete="organization" placeholder="Acme Trading Co." autoFocus />
                  </Field>
                  <Field id="tin" label="TIN" hint="Optional. Tax identification number, if you want it on your invoices." error={errors.tin} className="sm:col-span-2">
                    <input {...inp("tin", v, set, errors, busy)} autoComplete="off" placeholder="123-456-789-000" inputMode="text" />
                  </Field>
                </Section>

                <Section n="2" title="Contact">
                  <Field id="contactName" label="Contact person" required error={errors.contactName}>
                    <input {...inp("contactName", v, set, errors, busy)} autoComplete="name" placeholder="Juan Dela Cruz" />
                  </Field>
                  <Field id="phone" label="Phone" hint="Optional" error={errors.phone}>
                    <input {...inp("phone", v, set, errors, busy)} type="tel" autoComplete="tel" placeholder="+63 917 123 4567" />
                  </Field>
                  <Field id="email" label="Business email" required error={errors.email} hint="Invoices and receipts are sent to this address." className="sm:col-span-2">
                    <input {...inp("email", v, set, errors, busy)} type="email" autoComplete="email" placeholder="you@yourbusiness.com" />
                  </Field>
                </Section>

                <Section n="3" title="Business address">
                  <Field id="addressLine" label="Street address" required error={errors.addressLine} className="sm:col-span-2">
                    <input {...inp("addressLine", v, set, errors, busy)} autoComplete="street-address" placeholder="Unit, building, street" />
                  </Field>
                  <Field id="city" label="City" required error={errors.city}>
                    <input {...inp("city", v, set, errors, busy)} autoComplete="address-level2" />
                  </Field>
                  <Field id="state" label="State / Province" required error={errors.state}>
                    <input {...inp("state", v, set, errors, busy)} autoComplete="address-level1" />
                  </Field>
                  <Field id="postalCode" label="Postal code" required error={errors.postalCode}>
                    <input {...inp("postalCode", v, set, errors, busy)} autoComplete="postal-code" />
                  </Field>
                  <Field id="country" label="Country" required error={errors.country}>
                    <select
                      id="f-country" disabled={busy} value={v.country} onChange={(e) => set("country", e.target.value)}
                      autoComplete="country-name" className={inputCls(false)}
                    >
                      {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </Field>
                  {v.country === "Other" && (
                    <Field id="countryOther" label="Your country" required error={errors.countryOther} className="sm:col-span-2">
                      <input {...inp("countryOther", v, set, errors, busy)} autoComplete="country-name" />
                    </Field>
                  )}
                </Section>

                <Section n="4" title="Services to autopay">
                  <div className="sm:col-span-2">
                    <p className="text-sm text-slate-500">
                      Choose the services you want us to handle and pay for you. They appear as line items on your service invoice.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2" role="group" aria-label="Services to autopay">
                      {SERVICE_OPTIONS.map((s, i) => {
                        const on = v.services.includes(s.name);
                        return (
                          <label
                            key={s.name}
                            className={
                              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition " +
                              (on ? "border-[#00b386] bg-[#00b386]/5 ring-2 ring-[#00b386]/20" : "border-slate-200 bg-white hover:bg-slate-50")
                            }
                          >
                            <input
                              id={i === 0 ? "f-services" : undefined}
                              type="checkbox" disabled={busy} checked={on}
                              onChange={() =>
                                set("services", on ? v.services.filter((x) => x !== s.name) : [...v.services, s.name])
                              }
                              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#00b386]"
                            />
                            <span>
                              <span className="block text-sm font-semibold" style={{ color: NAVY }}>{s.name}</span>
                              <span className="block text-xs text-slate-500">{s.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.services && <p role="alert" className="mt-2 text-sm text-red-600">{errors.services}</p>}
                  </div>
                  <Field id="serviceNotes" label="Other needs or notes" hint="Optional. Anything else you want us to pay or set up (max 300 characters)." error={errors.serviceNotes} className="sm:col-span-2">
                    <textarea
                      id="f-serviceNotes" disabled={busy} rows={3} maxLength={300} value={v.serviceNotes}
                      onChange={(e) => set("serviceNotes", e.target.value)}
                      placeholder="e.g. We also use a domain registrar and an email service."
                      className={inputCls(false)}
                    />
                  </Field>
                </Section>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                    <input
                      id="f-consent" type="checkbox" disabled={busy} checked={v.consent}
                      onChange={(e) => set("consent", e.target.checked)}
                      aria-invalid={!!errors.consent}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#00b386]"
                    />
                    <span>
                      I confirm these details are accurate, and I agree to receive service invoices and receipts at the email above.
                    </span>
                  </label>
                  {errors.consent && <p role="alert" className="mt-2 text-sm text-red-600">{errors.consent}</p>}
                </div>

                {formError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>
                )}

                <button
                  type="submit" disabled={busy}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-[#00b386]/25 transition
                             hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-80
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b386]"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, #008f6b)` }}
                >
                  {busy ? "Registering…" : "Register business"}
                  {!busy && (
                    <svg className="transition group-hover:translate-x-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>

                <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Your details are used only to prepare your invoices and receipts.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

/* ───────── small building blocks ───────── */

function inputCls(error: boolean) {
  return (
    "w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 " +
    "focus:ring-4 disabled:opacity-60 " +
    (error
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
      : "border-slate-200 focus:border-[#00b386] focus:ring-[#00b386]/20")
  );
}

// Shared props for a text input bound to one field.
function inp(
  k: keyof Values,
  v: Values,
  set: <K extends keyof Values>(k: K, val: Values[K]) => void,
  errors: Errors,
  busy: boolean
) {
  return {
    id: `f-${k}`,
    name: k,
    disabled: busy,
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value as Values[typeof k]),
    className: inputCls(!!errors[k]),
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `e-${k}` : undefined,
  } as const;
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>{n}</span>
        <span className="text-lg font-bold" style={{ color: NAVY }}>{title}</span>
      </legend>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  id, label, required, hint, error, className = "", children,
}: {
  id: string; label: string; required?: boolean; hint?: string; error?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={`f-${id}`} className="block text-sm font-semibold" style={{ color: NAVY }}>
        {label} {required && <span className="text-red-600" aria-hidden>*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`e-${id}`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
