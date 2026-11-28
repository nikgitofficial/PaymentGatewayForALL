import { brand } from "./brand";
import { sql } from "./db";
import { addressLines, type CustomerInfo } from "./customer";
import { formatPHP, invoiceNumber, splitTotals, type InvoiceItem } from "./invoice";
import { getInvoiceHistory, type HistoryRow } from "./history";

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
  history?: HistoryRow[]; // filled in by sendReceiptEmail
  billTo?: CustomerInfo; // business name, address, TIN (filled in by sendReceiptEmail)
};

// Layout: light blue-grey page, white centered card, logo header with a divider, bold navy
// title, plain body text with bold key details, and a small-print footer. Inline styles + tables
// only, so it renders the same in Gmail, Outlook and when pasted into a Gmail message.
const NAVY = "#14295b";
const TEXT = "#1c2b4a";
const MUTED = "#6b7488";
const LINE = "#e3e7ee";
const LINK = "#1a6fe0";
const FONT = "Arial,Helvetica,sans-serif";

export function receiptHtml(r: Receipt) {
  const paid = r.paidAt.toLocaleDateString("en-PH", { dateStyle: "long" });
  const { subtotal, tax, taxLabel } = splitTotals(r.items);
  const logo = `${brand.url}/logo.png`;
  const receiptUrl = `${brand.url}/invoice/${r.invoiceId}`;
  const pdfUrl = `${brand.url}/api/invoice/${r.invoiceId}/pdf`;
  const p = `margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT}`;

  const detailRow = (k: string, v: string) =>
    `<tr><td style="padding:3px 12px 3px 0;color:${MUTED};font-size:14px">${k}</td><td style="padding:3px 0;font-size:14px;color:${TEXT};font-weight:bold">${v}</td></tr>`;

  // "Bill to" block: business name, contact, address, TIN and email.
  const b = r.billTo;
  const billLines = b ? addressLines(b) : [];
  const billBlock =
    b && (b.business_name || billLines.length)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="padding-bottom:4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">Bill to</td></tr>
          <tr><td style="font-size:14px;line-height:1.5;color:${TEXT}">${b.business_name ? `<b>${esc(b.business_name)}</b><br>` : ""}${
            b.contact_name ? `Attn: ${esc(b.contact_name)}<br>` : ""
          }${esc(r.to)}${b.phone ? `<br>${esc(b.phone)}` : ""}${billLines.length ? `<br>${billLines.map((l) => esc(l)).join("<br>")}` : ""}${
            b.tin ? `<br>TIN: ${esc(b.tin)}` : ""
          }</td></tr></table>`
      : "";

  const rows = r.items
    .filter((i) => i.kind !== "tax")
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${TEXT}"><b>${esc(i.name)}</b><br><span style="color:${MUTED};font-size:13px">${esc(i.description)}</span>${
          i.details?.length
            ? `<br><span style="color:${MUTED};font-size:12px">${i.details.map((d) => esc(d)).join(" &bull; ")}</span>`
            : ""
        }</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap;vertical-align:top;font-size:14px;color:${TEXT}">${formatPHP(i.amount)}</td></tr>`
    )
    .join("");

  const totalsRows =
    (tax > 0
      ? `<tr><td style="padding:10px 0 2px;text-align:right;color:${MUTED};font-size:14px">Subtotal</td><td style="padding:10px 0 2px 12px;text-align:right;font-size:14px;color:${TEXT}">${formatPHP(subtotal)}</td></tr>
         <tr><td style="padding:2px 0;text-align:right;color:${MUTED};font-size:14px">${esc(taxLabel)}</td><td style="padding:2px 0 2px 12px;text-align:right;font-size:14px;color:${TEXT}">${formatPHP(tax)}</td></tr>`
      : "") +
    `<tr><td style="padding:10px 0;text-align:right;font-weight:bold;font-size:15px;color:${NAVY}">Amount paid</td><td style="padding:10px 0 10px 12px;text-align:right;font-weight:bold;font-size:15px;color:${NAVY}">${formatPHP(r.total)}</td></tr>`;

  const hist = r.history ?? [];
  const historyBlock =
    hist.length > 1
      ? `<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:${NAVY}">Invoice history</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;color:${TEXT}">
        <tr style="color:${MUTED};text-align:left"><td style="padding:4px 0">Invoice</td><td>Date</td><td style="text-align:right">Amount</td><td style="text-align:right">Status</td></tr>
        ${hist
          .map(
            (h) => `<tr><td style="padding:6px 0;border-top:1px solid ${LINE}"><a href="${brand.url}/invoice/${h.id}" style="color:${LINK}">${invoiceNumber(h.invoiceNo)}</a></td>
          <td style="border-top:1px solid ${LINE}">${h.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
          <td style="border-top:1px solid ${LINE};text-align:right">${formatPHP(h.total)}</td>
          <td style="border-top:1px solid ${LINE};text-align:right">${h.status === "paid" ? "Paid" : h.status === "void" ? "Void" : "Unpaid"}</td></tr>`
          )
          .join("")}
      </table>`
      : "";

  const contact = brand.email
    ? `If you have any questions, contact <b>${esc(brand.email)}</b>.`
    : "If you have any questions, just reply to this email.";

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#eef1f7;font-family:${FONT};color:${TEXT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7">
    <tr><td align="center" style="padding:0 12px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff">
        <tr><td style="padding:18px 28px;border-bottom:1px solid ${LINE}">
          <img src="${logo}" alt="${esc(brand.name)}" height="52" style="height:52px;width:auto;display:block;border:0">
        </td></tr>
        <tr><td style="padding:28px 28px 8px">
          <h1 style="margin:0 0 28px;font-size:26px;line-height:1.25;color:${NAVY};font-weight:bold">Your payment receipt</h1>
          <p style="${p}">Hello,</p>
          <p style="${p}">Thank you for your payment. Here is your receipt for service invoice <b>${invoiceNumber(r.invoiceNo)}</b>, marked as <b>PAID</b>:</p>
          <p style="margin:24px 0;text-align:center;font-size:28px;font-weight:bold;color:${NAVY}">${formatPHP(r.total)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
            ${detailRow("Invoice number", invoiceNumber(r.invoiceNo))}
            ${detailRow("Date paid", paid)}
            ${r.paymentMethod ? detailRow("Payment method", esc(r.paymentMethod)) : ""}
          </table>
          ${billBlock}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid ${NAVY}">
            ${rows}
            ${totalsRows}
          </table>
          <p style="${p};margin-top:24px"><a href="${receiptUrl}" style="color:${LINK}">View your receipt online</a><br>
          <a href="${pdfUrl}" style="color:${LINK}">Download the PDF copy (${invoiceNumber(r.invoiceNo)}-receipt.pdf)</a></p>
          ${historyBlock ? `<div style="margin:0 0 16px">${historyBlock}</div>` : ""}
          <p style="${p}">${contact}</p>
          <p style="${p}">Thank you for choosing ${esc(brand.name)}!</p>
          <p style="${p}">Best regards,<br><b>${esc(brand.name)} Team</b></p>
        </td></tr>
        <tr><td style="padding:0 28px"><div style="height:20px"></div></td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid ${LINE}">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle" style="padding-right:14px"><img src="${logo}" alt="${esc(brand.name)}" height="30" style="height:30px;width:auto;display:block;border:0"></td>
            <td valign="middle" style="font-size:10px;line-height:1.5;color:${MUTED}">This email contains confidential information for the sole use of the intended recipient. If you are not the intended recipient, please contact the sender, delete this email, and maintain the confidentiality of what you may have read.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
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
  // Add the customer's invoice history and billing details (never block the receipt if a lookup fails).
  const history = await getInvoiceHistory(r.to).catch(() => []);
  let billTo = r.billTo;
  if (!billTo) {
    try {
      const [lead] = await sql`
        SELECT business_name, contact_name, phone, address_line, city, state, postal_code, country, tin
        FROM leads WHERE lower(email) = lower(${r.to}) LIMIT 1`;
      billTo = lead as CustomerInfo | undefined;
    } catch {}
  }
  r = { ...r, history, billTo };
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
