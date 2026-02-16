import { useEffect, useState } from "react";
import { userApi } from "@samofujera/api-client";
import { Info, Mail, Phone } from "lucide-react";

interface AuthState {
  authenticated: boolean;
  role?: string;
}

export function TopBar() {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          setAuth({ authenticated: true, role: response.data.role });
        }
      } catch {
        if (!cancelled) {
          setAuth({ authenticated: false });
        }
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const activeColor = "text-[rgb(230,188,145)]";

  function authLinkClass(href: string) {
    const isActive = pathname.startsWith(href);
    return `topbar-auth-link uppercase transition-colors${isActive ? " active" : ""}`;
  }

  return (
    <div
      className="relative bg-repeat text-white text-[13px] font-medium py-2.5"
      style={{ backgroundImage: "url('/images/bg-pattern-green.jpg')" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4">
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

        <div className="flex items-center gap-4 mx-auto sm:mx-0 sm:ml-auto">
          {auth === null ? (
            <span className="h-4" />
          ) : auth.authenticated ? (
            <>
              {auth.role === "ADMIN" && (
                <a href="/admin" className={authLinkClass("/admin")}>
                  Administrace
                </a>
              )}
              <a href="/muj-ucet" className={authLinkClass("/muj-ucet")}>
                Můj účet
              </a>
            </>
          ) : (
            <>
              <a href="/prihlaseni" className={authLinkClass("/prihlaseni")}>
                Přihlášení
              </a>
              <span className="text-white/40">|</span>
              <a href="/registrace" className={authLinkClass("/registrace")}>
                Registrace
              </a>
            </>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-white/30" />
    </div>
  );
}
