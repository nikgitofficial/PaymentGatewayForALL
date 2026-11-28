import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { SERVICE_NAMES } from "@/lib/services";
import { COOKIE, cookieOpts, makeToken } from "@/lib/session";

export const runtime = "nodejs";

// Public. A customer registers their business so invoices can be issued to them with the right
// "Bill to" details. This creates NO invoice; the owner issues those from /admin.
// If the email already has a registration, it is NOT overwritten (so nobody can change another
// customer's billing details by knowing their email); the customer is asked to contact support.
const text = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `Enter the ${label}.`).max(max, `${label[0].toUpperCase()}${label.slice(1)} is too long.`);

const Body = z.object({
  businessName: text("business name", 2, 120),
  tin: z
    .string().trim().max(30, "TIN is too long.")
    .regex(/^[0-9A-Za-z][0-9A-Za-z\- ]*$|^$/, "Use letters, numbers and dashes only.")
    .optional(),
  contactName: text("contact person's name", 2, 80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z
    .string().trim()
    .regex(/^[0-9+()\-\s.]{7,30}$|^$/, "Enter a valid phone number.")
    .optional(),
  addressLine: text("street address", 3, 160),
  city: text("city", 2, 80),
  state: text("state or province", 2, 80),
  postalCode: z
    .string().trim().min(2, "Enter the postal code.").max(20, "Postal code is too long.")
    .regex(/^[0-9A-Za-z][0-9A-Za-z\- ]*$/, "Use letters, numbers and dashes only."),
  country: text("country", 2, 60),
  services: z
    .array(z.string())
    .min(1, "Choose at least one service.")
    .max(SERVICE_NAMES.length)
    .refine((a) => a.every((s) => SERVICE_NAMES.includes(s)), "Choose from the listed services."),
  serviceNotes: z.string().trim().max(300, "Notes are too long.").optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm to continue." }) }),
  website: z.string().max(0).optional(), // honeypot: real people leave this empty
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !fields[k]) fields[k] = i.message;
    }
    // A filled honeypot looks like a success to bots.
    if (fields.website) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Please check the highlighted fields.", fields }, { status: 400 });
  }
  const d = parsed.data;
  const nul = (v?: string) => (v && v.trim() ? v.trim() : null);
  const services = JSON.stringify(Array.from(new Set(d.services)));

  try {
    const [existing] = await sql`SELECT id, registered_at FROM leads WHERE lower(email) = ${d.email} LIMIT 1`;
    if (existing?.registered_at) {
      return NextResponse.json(
        { error: "This email is already registered. To change your details, please contact support." },
        { status: 409 }
      );
    }

    let leadId: string | undefined = existing?.id;
    if (existing) {
      // The owner already issued an invoice to this email before registration existed: attach the details.
      await sql`
        UPDATE leads SET business_name = ${d.businessName}, contact_name = ${d.contactName}, phone = ${nul(d.phone)},
          address_line = ${d.addressLine}, city = ${d.city}, state = ${d.state}, postal_code = ${d.postalCode},
          country = ${d.country}, tin = ${nul(d.tin)}, services = ${services}::jsonb, service_notes = ${nul(d.serviceNotes)},
          registered_at = now()
        WHERE id = ${existing.id} AND registered_at IS NULL`;
    } else {
      const [created] = await sql`
        INSERT INTO leads (email, verified, business_name, contact_name, phone, address_line, city, state,
                           postal_code, country, tin, services, service_notes, registered_at)
        VALUES (${d.email}, false, ${d.businessName}, ${d.contactName}, ${nul(d.phone)}, ${d.addressLine}, ${d.city},
                ${d.state}, ${d.postalCode}, ${d.country}, ${nul(d.tin)}, ${services}::jsonb, ${nul(d.serviceNotes)}, now())
        RETURNING id`;
      leadId = created?.id;
    }
    const res = NextResponse.json({ ok: true, leadId: leadId ?? null });
    try {
      if (leadId) res.cookies.set(COOKIE, makeToken(leadId), cookieOpts); // signed in right after registering
    } catch {}
    return res;
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not save your registration. Please try again." }, { status: 500 });
  }
}
