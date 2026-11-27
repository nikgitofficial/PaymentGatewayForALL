import { brand } from "./brand";
import { formatPHP, invoiceNumber, splitTotals, type InvoiceItem } from "./invoice";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Receipt = {
  to: string;
  invoiceNo: number;
  items: InvoiceItem[];
  total: number; // centavos
  paidAt: Date;
  paymentMethod?: string;
  invoiceId: string;
};

export function receiptHtml(r: Receipt) {
  const paid = r.paidAt.toLocaleDateString("en-PH", { dateStyle: "long" });
  const { subtotal, tax, taxLabel } = splitTotals(r.items);
  const taxRows =
    tax > 0
      ? `<tr><td style="padding:8px 0;color:#777">Subtotal</td><td style="padding:8px 0;text-align:right">${formatPHP(subtotal)}</td></tr>
         <tr><td style="padding:2px 0;color:#777">${esc(taxLabel)}</td><td style="padding:2px 0;text-align:right">${formatPHP(tax)}</td></tr>`
      : "";
  const rows = r.items
    .filter((i) => i.kind !== "tax")
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">${esc(i.name)}<br><span style="color:#777;font-size:13px">${esc(i.description)}</span>${
          i.details?.length
            ? `<br><span style="color:#777;font-size:12px">${i.details.map((d) => "• " + esc(d)).join("<br>")}</span>`
            : ""
        }</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatPHP(i.amount)}</td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;padding:28px">
      <img src="${brand.url}/logo.png" alt="${esc(brand.name)}" height="56" style="height:56px;width:auto;display:block;margin:0 0 16px">
      <p style="color:#777;font-size:13px;margin:0">Receipt from ${esc(brand.name)}</p>
      <p style="font-size:32px;font-weight:700;margin:6px 0 2px">${formatPHP(r.total)}</p>
      <p style="color:#777;font-size:13px;margin:0 0 20px">Paid ${paid}</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="color:#777;padding:4px 0">Invoice number</td><td style="text-align:right">${invoiceNumber(r.invoiceNo)}</td></tr>
        ${r.paymentMethod ? `<tr><td style="color:#777;padding:4px 0">Payment method</td><td style="text-align:right">${esc(r.paymentMethod)}</td></tr>` : ""}
      </table>
    </div>
    <div style="background:#fff;border-radius:12px;padding:28px;margin-top:16px">
      <p style="font-weight:700;margin:0 0 12px">Receipt ${invoiceNumber(r.invoiceNo)}</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse">${rows}
        ${taxRows}
        <tr><td style="padding:12px 0;font-weight:700">Amount paid</td><td style="padding:12px 0;text-align:right;font-weight:700">${formatPHP(r.total)}</td></tr>
      </table>
      <p style="margin:20px 0 0"><a href="${brand.url}/invoice/${r.invoiceId}" style="color:#1f5c4a">View invoice</a></p>
      <p style="color:#777;font-size:13px;margin:16px 0 0">Questions? ${brand.email ? `Contact ${esc(brand.email)}` : "Reply to this email"}.</p>
    </div>
  </div></body></html>`;
}

// Sends via Resend (https://resend.com). Needs RESEND_API_KEY and EMAIL_FROM
// (an address on a domain you verified in Resend).
export async function sendReceiptEmail(r: Receipt) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("Receipt email skipped: set RESEND_API_KEY and EMAIL_FROM.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${brand.name} <${from}>`,
      to: [r.to],
      reply_to: brand.email || undefined,
      subject: `Your receipt from ${brand.name} (${invoiceNumber(r.invoiceNo)})`,
      html: receiptHtml(r),
    }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text());
}
