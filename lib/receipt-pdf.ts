import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { brand } from "./brand";
import { invoiceNumber, splitTotals, type InvoiceItem } from "./invoice";

// Builds the PAID receipt as a PDF (A4). Uses built-in PDF fonts, which have no peso sign,
// so amounts are written as "PHP 1,234.00".
type Opts = {
  invoiceNo: number;
  email: string; // bill to
  billTo?: { name?: string; contact?: string; phone?: string; lines: string[]; tin?: string };
  items: InvoiceItem[];
  total: number; // centavos
  issuedAt: Date;
  paidAt: Date | null;
  paymentMethod?: string;
  logoPng?: Uint8Array;
};

const money = (c: number) =>
  "PHP " + (c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: Date) => d.toLocaleDateString("en-PH", { dateStyle: "long" });
// Built-in fonts only cover Latin-1 + a few symbols; anything else becomes "?".
const clean = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF\u2022\u2013\u2014\u2018\u2019\u201C\u201D]/g, "?");

const INK = rgb(0.08, 0.14, 0.12);
const MUTED = rgb(0.42, 0.46, 0.44);
const LINE = rgb(0.84, 0.86, 0.84);
const GREEN = rgb(0.12, 0.36, 0.29);

export async function buildReceiptPdf(o: Opts): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 50, R = W - M;

  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (p: PDFPage, s: string, x: number, yy: number, size: number, f: PDFFont = font, color = INK) =>
    p.drawText(clean(s), { x, y: yy, size, font: f, color });
  const right = (s: string, yy: number, size: number, f: PDFFont = font, color = INK, edge = R) =>
    text(page, s, edge - f.widthOfTextAtSize(clean(s), size), yy, size, f, color);
  const wrap = (s: string, size: number, f: PDFFont, maxW: number) => {
    const words = clean(s).split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (f.widthOfTextAtSize(t, size) <= maxW) cur = t;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const ensure = (need: number) => {
    if (y - need < M + 30) { page = pdf.addPage([W, H]); y = H - M; }
  };

  // ── Header
  text(page, "RECEIPT", M, y - 22, 26, bold);
  if (o.logoPng) {
    try {
      const img = await pdf.embedPng(o.logoPng);
      const h = 46, w = (img.width / img.height) * h;
      page.drawImage(img, { x: R - w, y: y - h + 4, width: w, height: h });
    } catch {}
  }
  y -= 44;

  // PAID badge
  const badge = "PAID";
  const bw = bold.widthOfTextAtSize(badge, 14) + 24;
  page.drawRectangle({ x: M, y: y - 22, width: bw, height: 24, borderColor: GREEN, borderWidth: 1.5, color: rgb(0.92, 0.97, 0.94) });
  text(page, badge, M + 12, y - 15, 14, bold, GREEN);
  y -= 46;

  // ── Details (left) and business (right)
  const rows: [string, string][] = [
    ["Invoice number", invoiceNumber(o.invoiceNo)],
    ["Date issued", day(o.issuedAt)],
    ...(o.paidAt ? ([["Date paid", day(o.paidAt)]] as [string, string][]) : []),
    ...(o.paymentMethod ? ([["Payment method", o.paymentMethod]] as [string, string][]) : []),
  ];
  const top = y;
  rows.forEach(([k, v], i) => {
    text(page, k, M, top - i * 16, 10, bold);
    text(page, v, M + 100, top - i * 16, 10);
  });
  let by = top;
  const biz = [brand.name, brand.address, brand.email, brand.tin && `TIN: ${brand.tin}`, brand.vatStatus].filter(Boolean) as string[];
  biz.forEach((l, i) => right(l, by - i * 14, i === 0 ? 11 : 10, i === 0 ? bold : font, i === 0 ? INK : MUTED));
  y = top - Math.max(rows.length * 16, biz.length * 14) - 18;

  // Compact "Bill to": name, address on one wrapped line, "Attn / TIN" on one line, email.
  const bt: { s: string; f: PDFFont; c: typeof INK }[] = [];
  if (o.billTo?.name) bt.push({ s: o.billTo.name, f: bold, c: INK });
  if (o.billTo?.contact) bt.push({ s: `Attn: ${o.billTo.contact}`, f: font, c: MUTED });
  bt.push({ s: o.email, f: font, c: MUTED });
  if (o.billTo?.phone) bt.push({ s: o.billTo.phone, f: font, c: MUTED });
  if (o.billTo?.lines.length) {
    wrap(o.billTo.lines.join(", "), 10, font, (R - M) * 0.7).forEach((l) => bt.push({ s: l, f: font, c: MUTED }));
  }
  if (o.billTo?.tin) bt.push({ s: `TIN: ${o.billTo.tin}`, f: font, c: MUTED });
  text(page, "Bill to", M, y, 10, bold);
  bt.forEach((l, i) => text(page, l.s, M, y - 14 * (i + 1), 10, l.f, l.c));
  y -= 14 * bt.length + 28;

  // Amount paid headline
  text(page, `${money(o.total)} paid`, M, y, 18, bold);
  y -= 26;

  // ── Items
  const amtX = R;
  const descW = R - M - 110;
  page.drawLine({ start: { x: M, y: y + 4 }, end: { x: R, y: y + 4 }, thickness: 0.8, color: INK });
  text(page, "Description", M, y - 12, 9, bold);
  right("Amount", y - 12, 9, bold);
  y -= 34;

  for (const it of o.items.filter((i) => i.kind !== "tax")) {
    const desc = wrap(it.description, 9, font, descW);
    // Specs run together on wrapped lines ("a  •  b  •  c") to keep the receipt to one page.
    const det = it.details?.length ? wrap(it.details.join("  •  "), 8, font, descW) : [];
    ensure(14 + desc.length * 11 + det.length * 10 + 10);
    text(page, it.name, M, y, 10.5, bold);
    right(money(it.amount), y, 10.5, font, INK, amtX);
    y -= 13;
    desc.forEach((l) => { text(page, l, M, y, 9, font, MUTED); y -= 11; });
    det.forEach((l) => { text(page, l, M, y, 8, font, MUTED); y -= 10; });
    y -= 6;
    page.drawLine({ start: { x: M, y: y + 3 }, end: { x: R, y: y + 3 }, thickness: 0.5, color: LINE });
    y -= 8;
  }

  // ── Totals
  ensure(90);
  const { subtotal, tax, taxLabel } = splitTotals(o.items);
  if (tax > 0) {
    right("Subtotal", y, 10, font, MUTED, R - 120);
    right(money(subtotal), y, 10);
    y -= 15;
    right(taxLabel, y, 10, font, MUTED, R - 120);
    right(money(tax), y, 10);
    y -= 15;
  }
  y -= 4;
  right("Amount paid", y, 12, bold, INK, R - 120);
  right(money(o.total), y, 14, bold);
  y -= 34;

  // Stamp (light, rotated) so it reads as paid even when printed in black & white
  page.drawText("PAID", {
    x: W / 2 - 70, y: y - 40, size: 72, font: bold, color: GREEN, opacity: 0.12, rotate: degrees(12),
  });
  text(page, "Thank you for your payment.", M, y - 10, 10, font, MUTED);

  pdf.setTitle(`${invoiceNumber(o.invoiceNo)} Receipt`);
  pdf.setAuthor(brand.name);
  return pdf.save();
}
