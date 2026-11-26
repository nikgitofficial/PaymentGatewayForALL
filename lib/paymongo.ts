import crypto from "crypto";
import type { InvoiceItem } from "./invoice";

const auth = () =>
  "Basic " + Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64");

export async function createCheckoutSession(opts: {
  invoiceId: string;
  items: InvoiceItem[];
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const res = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth() },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: opts.items.map((i) => ({
            name: i.name,
            amount: i.amount,
            currency: "PHP",
            quantity: 1,
          })),
          payment_method_types: ["qrph", "gcash", "paymaya", "card"],
          reference_number: opts.invoiceId,
          success_url: `${appUrl}/success`,
          cancel_url: `${appUrl}/invoice/${opts.invoiceId}`,
        },
      },
    }),
  });

  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    console.error("PayMongo error:", res.status, JSON.stringify(json));
    throw new Error("PayMongo request failed");
  }
  return {
    id: json.data.id as string,
    checkoutUrl: json.data.attributes.checkout_url as string,
  };
}

// Header looks like: t=1700000000,te=<testSig>,li=<liveSig>
export function verifyWebhook(rawBody: string, header: string | undefined) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string])
  );
  const expected = crypto
    .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET!)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");
  const sig = process.env.PAYMONGO_SECRET_KEY!.startsWith("sk_test") ? parts.te : parts.li;
  if (!sig || sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
