import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Přihlášení" };

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <LoginForm />
    </div>
  );
}
