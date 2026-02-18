import { AuthGuard } from "@/components/auth/AuthGuard";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
