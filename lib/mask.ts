// Show only the last 4 characters of sensitive numbers (account / reference numbers).
// maskTail("1234567890123") -> "*********0123"   (same length, so it still looks like a number)
export function maskTail(value: string, keep = 4): string {
  const v = value.trim();
  if (v.length <= keep) return "*".repeat(v.length);
  return "*".repeat(v.length - keep) + v.slice(-keep);
}

// Shorter form for receipts: "****0123"
export function maskShort(value: string, keep = 4): string {
  const v = value.trim();
  return "****" + v.slice(-Math.min(keep, v.length));
}
