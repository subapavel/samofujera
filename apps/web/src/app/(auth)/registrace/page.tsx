import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Registrace" };

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <RegisterForm />
    </div>
  );
}
