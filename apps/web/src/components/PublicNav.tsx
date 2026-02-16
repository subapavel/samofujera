import { useState, useRef, useEffect } from "react";
import { ChevronDown, ShoppingBag } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Úvod", href: "/" },
  { label: "O Sámovi", href: "/o-samovi" },
  { label: "Konzultace", href: "/konzultace" },
  { label: "Besedování", href: "/besedovani" },
  {
    label: "Akce",
    href: "/akce",
    children: [
      { label: "Kalendář setkání 2026", href: "/akce/kalendar" },
      { label: "Meditace se Samem", href: "/akce/meditace" },
      { label: "Akce na přání", href: "/akce/na-prani" },
      { label: "Čištění prostoru", href: "/akce/cisteni-prostoru" },
      { label: "Dovolená se Samem", href: "/akce/dovolena" },
      { label: "Kurzy vaření", href: "/akce/kurzy-vareni" },
    ],
  },
  { label: "Články", href: "/clanky" },
  {
    label: "Více",
    href: "#",
    children: [
      { label: "Otázky a odpovědi", href: "/otazky-a-odpovedi" },
      { label: "Tvorba", href: "/tvorba" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
];

interface PublicNavProps {
  currentPath: string;
}

export function PublicNav({ currentPath }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  function isActive(item: NavItem): boolean {
    if (item.href === "/" && currentPath === "/") return true;
    if (item.href !== "/" && currentPath.startsWith(item.href)) return true;
    if (item.children?.some((c) => currentPath.startsWith(c.href)))
      return true;
    return false;
  }

  function toggleDropdown(label: string) {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }

  return (
    <nav
      ref={navRef}
      className="relative bg-repeat"
      style={{
        backgroundImage: "url('/images/bg-pattern-green.jpg')",
        fontFamily: "'Josefin Sans', sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-[22px]">
          {/* Logo */}
          <a
            href="/"
            className="text-[21px] font-light text-white whitespace-nowrap ml-[78px]"
          >
            Sámo Fujera
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center">
            {navItems.map((item, index) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    className={`nav-link px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors ${
                      isActive(item) ? "active" : ""
                    } ${index < navItems.length - 1 ? "nav-separator" : ""}`}
                  >
                    {item.label}
                    <ChevronDown className="inline size-3 ml-0.5" />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className={`nav-link px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors ${
                      isActive(item) ? "active" : ""
                    } ${index < navItems.length - 1 ? "nav-separator" : ""}`}
                  >
                    {item.label}
                  </a>
                )}

                {/* Dropdown */}
                {item.children && openDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg py-2 min-w-48 z-50">
                    {item.children.map((child) => (
                      <a
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Separator + Košík */}
            <span className="relative mx-4 h-[34px] w-px bg-white/35" />
            <a
              href="/kosik"
              className="nav-link px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors flex items-center gap-1.5"
            >
              Košík
              <ShoppingBag className="size-4" strokeWidth={1.5} />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-white p-2"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[var(--primary)]/95 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.label)}
                      className={`nav-link w-full text-left px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors ${
                        isActive(item) ? "active" : ""
                      }`}
                    >
                      {item.label}
                      <ChevronDown className={`inline size-3 ml-0.5 transition-transform ${openDropdown === item.label ? "rotate-180" : ""}`} />
                    </button>
                    {openDropdown === item.label && (
                      <div className="pl-6 space-y-1">
                        {item.children.map((child) => (
                          <a
                            key={child.href}
                            href={child.href}
                            className="nav-link block px-3 py-1.5 text-sm transition-colors"
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <a
                    href={item.href}
                    className={`nav-link block px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors ${
                      isActive(item) ? "active" : ""
                    }`}
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 mt-2">
              <a
                href="/kosik"
                className="nav-link block px-[10px] py-2 text-[15px] font-light uppercase tracking-wide transition-colors"
              >
                Košík
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
