import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Allura, Inter, Josefin_Sans, Open_Sans } from "next/font/google";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600"],
  variable: "--font-heading",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-open-sans",
  display: "swap",
});

const allura = Allura({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  variable: "--font-decorative",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sámo Fujera",
    template: "%s | Sámo Fujera",
  },
  description:
    "Oficiální web Sáma Fujery. Texty, přednášky a setkání o životě, zdraví a hlubších souvislostech, o kterých se běžně nemluví.",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "cs";

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${josefinSans.variable} ${openSans.variable} ${allura.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-[var(--foreground)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
