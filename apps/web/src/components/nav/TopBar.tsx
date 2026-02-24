"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Info, Mail, Phone } from "lucide-react";
import { usePublicAuth } from "./PublicAuthProvider";

export function TopBar() {
  const { user, isLoading } = usePublicAuth();
  const pathname = usePathname();

  function authLinkClass(href: string) {
    const isActive = pathname.startsWith(href);
    return `topbar-auth-link uppercase transition-colors${isActive ? " active" : ""}`;
  }

  return (
    <div
      className="relative bg-repeat text-white text-[13px] font-medium py-[10.5px]"
      style={{ backgroundImage: "url('/images/bg-pattern-green.jpg')" }}
    >
      <div className="max-w-[1128px] mx-auto px-4 nav:pl-[12px] nav:pr-[32px] flex items-center justify-between">
        <div className="hidden nav:flex items-center gap-4">
          <a
            href="tel:+420728137626"
            className="flex items-center gap-1.5 text-[rgb(230,188,145)] hover:text-[rgb(245,210,170)] transition-colors underline decoration-[rgba(230,188,145,0.5)] underline-offset-4"
          >
            <Phone className="size-3.5" />
            +420 728 137 626
          </a>
          <a
            href="mailto:info@samfujera.cz"
            className="flex items-center gap-1.5 text-[rgb(230,188,145)] hover:text-[rgb(245,210,170)] transition-colors underline decoration-[rgba(230,188,145,0.5)] underline-offset-4"
          >
            <Mail className="size-3.5" />
            info@samfujera.cz
          </a>
          <span className="flex items-center gap-1.5 text-white">
            <Info className="size-3.5" />
            Volejte pondělí-pátek 10.00-17.00 hodin
          </span>
        </div>

        <div className="flex items-center gap-4 mx-auto nav:mx-0 nav:ml-auto">
          {isLoading ? (
            <span className="h-4" />
          ) : user ? (
            <Link href="/muj-ucet" className={authLinkClass("/muj-ucet")}>
              Můj účet
            </Link>
          ) : (
            <>
              <Link href="/prihlaseni" className={authLinkClass("/prihlaseni")}>
                Přihlášení
              </Link>
              <span className="text-white/40">|</span>
              <Link href="/registrace" className={authLinkClass("/registrace")}>
                Registrace
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-white/30" />
    </div>
  );
}
