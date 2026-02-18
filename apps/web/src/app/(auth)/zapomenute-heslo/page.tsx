import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Zapomenuté heslo" };

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <ForgotPasswordForm />
    </div>
  );
}
