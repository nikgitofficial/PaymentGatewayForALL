"use client";

import { useState } from "react";

// "Email receipt + PDF" does three things from one click:
//   1. downloads the PAID receipt as a PDF,
//   2. copies the designed receipt email (formatted, with logo) to the clipboard,
//   3. opens a Gmail compose window with the customer's address and the subject filled in.
// In Gmail: click the message body, press Ctrl+V to paste the designed email, drag the PDF in
// (or use the paperclip), then Send. Gmail can't pre-attach files, so that step is manual.
export default function EmailReceiptButton({
  invoiceId,
  email,
  label,
  amountLabel,
  link,
  pdfLink,
  businessName,
}: {
  invoiceId: string;
  email: string;
  label: string;
  amountLabel: string;
  link: string;
  pdfLink: string;
  businessName: string;
}) {
  const [status, setStatus] = useState<"" | "rich" | "plain">("");
  const [copied, setCopied] = useState(false);

  const fileName = `${label}-receipt.pdf`;
  const downloadUrl = `/api/invoice/${invoiceId}/pdf?download=1`;
  const htmlUrl = `/api/invoice/${invoiceId}/email-html`;

  const subject = `Your receipt from ${businessName} (${label}) - PAID`;
  const plainBody =
    `Hello,\n\n` +
    `Thank you for your payment of ${amountLabel}. Your receipt for ${label}, marked as PAID, is attached as a PDF.\n\n` +
    `You can also view it online:\n${link}\n\n` +
    `PDF copy:\n${pdfLink}\n\n` +
    `Regards,\n${businessName}`;

  const gmail = (withBody: boolean) =>
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}` +
    (withBody ? `&body=${encodeURIComponent(plainBody)}` : "");

  function downloadPdf() {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Designed email: copy it as rich HTML, then open an empty Gmail draft to paste it into.
  async function emailWithPdf() {
    downloadPdf();
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("no rich clipboard");
      const html = fetch(htmlUrl, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.text();
        })
        .then((t) => new Blob([t], { type: "text/html" }));
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": html, "text/plain": new Blob([plainBody], { type: "text/plain" }) }),
      ]);
      window.open(gmail(false), "_blank", "noopener,noreferrer");
      setStatus("rich");
    } catch {
      // Clipboard blocked: fall back to a plain-text draft that already contains the message.
      window.open(gmail(true), "_blank", "noopener,noreferrer");
      setStatus("plain");
    }
  }

  function plainDraft() {
    window.open(gmail(true), "_blank", "noopener,noreferrer");
    setStatus("plain");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this receipt link:", link);
    }
  }

  const btn = "rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold hover:bg-paper";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={emailWithPdf} className={btn}>Email receipt + PDF</button>
        <a href={downloadUrl} download={fileName} className={btn}>PDF</a>
        <button type="button" onClick={plainDraft} className={btn}>Plain draft</button>
        <button type="button" onClick={copyLink} className={btn}>{copied ? "Copied" : "Copy link"}</button>
      </span>
      {status === "rich" && (
        <span role="status" className="max-w-[18rem] text-right text-xs text-moss">
          Receipt email copied and {fileName} downloaded. In Gmail: click the message, press Ctrl+V, attach the PDF, then Send.
        </span>
      )}
      {status === "plain" && (
        <span role="status" className="max-w-[18rem] text-right text-xs text-moss">
          Plain draft opened. Attach the downloaded {fileName}, then Send.
        </span>
      )}
    </span>
  );
}
