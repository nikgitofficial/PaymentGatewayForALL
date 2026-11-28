import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { brand } from "@/lib/brand";
import { COOKIE, cookieOpts, makeToken } from "@/lib/session";

export const runtime = "nodejs";

// Email login. Works for a registered customer, or an email the owner has already issued an
// invoice to. Anything else gets "no account found" so the customer is sent to /register.
// NOTE: the email alone is the credential (no password or emailed code).
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;

  try {
    const [lead] = await sql`
      SELECT l.id, l.registered_at,
             EXISTS (SELECT 1 FROM invoices i WHERE i.lead_id = l.id) AS has_invoice
      FROM leads l WHERE lower(l.email) = ${email} LIMIT 1`;
    if (!lead || !(lead.registered_at || lead.has_invoice)) {
      return NextResponse.json({ notFound: true, contactEmail: brand.email || null }, { status: 404 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, makeToken(lead.id as string), cookieOpts);
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not log you in. Check that SESSION_SECRET is set, then try again." }, { status: 500 });
  }
}
