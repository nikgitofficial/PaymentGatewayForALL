import { brand } from "@/lib/brand";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Register your business",
  description: "Register your business to receive and pay your service invoices in one place.",
};

export default function RegisterPage() {
  return <RegisterForm contactEmail={brand.email} />;
}
