// ALLOWED_EMAILS in .env: comma-separated emails and/or whole domains.
//   ALLOWED_EMAILS=jane@gmail.com,bob@company.com,@mycompany.com
// An entry starting with "@" allows everyone at that domain.
// If ALLOWED_EMAILS is empty or missing, every email is allowed.
export function isEmailAllowed(email: string) {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return true;
  const e = email.trim().toLowerCase();
  return list.some((entry) => (entry.startsWith("@") ? e.endsWith(entry) : e === entry));
}
