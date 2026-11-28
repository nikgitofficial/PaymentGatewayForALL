// Where customers send money. Fill these in .env with YOUR real accounts.
// A method is only offered on the invoice if its fields are set.
export type PayMethod = {
  id: "gcash" | "bank";
  label: string;
  lines: { k: string; v: string }[];
  refLabel: string;
  refHint: string;
};

export function paymentMethods(): PayMethod[] {
  const e = process.env;
  const out: PayMethod[] = [];
  if (e.PAY_GCASH_NUMBER) {
    out.push({
      id: "gcash",
      label: "GCash",
      lines: [
        ...(e.PAY_GCASH_NAME ? [{ k: "Account name", v: e.PAY_GCASH_NAME }] : []),
        { k: "GCash number", v: e.PAY_GCASH_NUMBER },
      ],
      refLabel: "GCash reference number",
      refHint: "Shown on your GCash receipt after sending (usually 13 digits)",
    });
  }
  if (e.PAY_BANK_ACCOUNT_NUMBER) {
    out.push({
      id: "bank",
      label: "Bank transfer",
      lines: [
        ...(e.PAY_BANK_NAME ? [{ k: "Bank", v: e.PAY_BANK_NAME }] : []),
        ...(e.PAY_BANK_ACCOUNT_NAME ? [{ k: "Account name", v: e.PAY_BANK_ACCOUNT_NAME }] : []),
        { k: "Account number", v: e.PAY_BANK_ACCOUNT_NUMBER },
      ],
      refLabel: "Bank transfer reference number",
      refHint: "The reference / confirmation number on your transfer receipt",
    });
  }
  return out;
}

export const REF_PATTERN = /^[A-Za-z0-9-]{6,40}$/;
