"use client";

// "Download PDF" opens the browser's print dialog; choose "Save as PDF".
// The document title becomes the suggested file name (e.g. INV-001-receipt).
export default function PrintButtons({ fileName }: { fileName: string }) {
  function run() {
    const prev = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => (document.title = prev), 500);
  }

  const btn =
    "rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold transition hover:bg-paper " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss";

  return (
    <div className="flex gap-2 print:hidden">
      <button type="button" onClick={run} className={btn}>Print</button>
      <button type="button" onClick={run} className={btn}>Download PDF</button>
    </div>
  );
}
