import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@samofujera/ui";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { MainContent } from "@/components/dashboard/main-content";
import { Providers } from "@/components/dashboard/Providers";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  return (
    <Providers>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <MainContent>{children}</MainContent>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
