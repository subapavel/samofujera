import { TopBar } from "@/components/nav/TopBar";
import { PublicNav } from "@/components/nav/PublicNav";
import { Footer } from "@/components/nav/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="px-2 mt-2 nav:mt-4 nav:px-4">
        <PublicNav />
      </div>
      <main className="page-content flex-1 px-2 py-2 nav:px-4 nav:py-4">{children}</main>
      <Footer />
    </div>
  );
}
