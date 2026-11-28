import { redirect } from "next/navigation";

// Old id-in-the-link dashboard URL. The dashboard now needs a login, so send people there.
export default function OldDashboardLink() {
  redirect("/dashboard");
}
