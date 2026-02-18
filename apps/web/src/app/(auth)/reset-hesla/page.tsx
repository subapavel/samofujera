import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Obnovení hesla" };

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
