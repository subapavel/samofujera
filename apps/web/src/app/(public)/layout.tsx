import { TopBar } from "@/components/nav/TopBar";
import { PublicNav } from "@/components/nav/PublicNav";
import { Footer } from "@/components/nav/Footer";
import { AdminBar } from "@/components/nav/AdminBar";
import { PublicAuthProvider } from "@/components/nav/PublicAuthProvider";
import { PageIdProvider } from "@/components/nav/PageIdProvider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicAuthProvider>
      <PageIdProvider>
        <div className="flex flex-col min-h-screen">
          <AdminBar />
          <TopBar />
          <div className="px-2 mt-2 nav:mt-4 nav:px-4">
            <PublicNav />
          </div>
          <main className="flex-1 px-2 py-2 nav:px-4 nav:py-4">{children}</main>
          <Footer />
        </div>
      </PageIdProvider>
    </PublicAuthProvider>
  );
}
