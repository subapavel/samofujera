import { useState, useRef, useEffect } from "react";

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
      className="relative bg-cover bg-center"
      style={{ backgroundImage: "url('/images/bg-pattern-green.jpg')" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a
            href="/"
            className="text-xl font-medium text-white whitespace-nowrap"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Sámo Fujera
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div key={item.label} className="relative">
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    className={`px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                      isActive(item)
                        ? "text-amber-400"
                        : "text-white/90 hover:text-amber-400"
                    }`}
                  >
                    {item.label}
                    <span className="ml-1 text-[10px]">&#9662;</span>
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className={`px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                      isActive(item)
                        ? "text-amber-400"
                        : "text-white/90 hover:text-amber-400"
                    }`}
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
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[var(--primary)] transition-colors"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Separator + Košík */}
            <span className="text-white/30 mx-2">|</span>
            <a
              href="/kosik"
              className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/90 hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              Košík
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
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
                      className={`w-full text-left px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${
                        isActive(item)
                          ? "text-amber-400"
                          : "text-white/90 hover:text-amber-400"
                      }`}
                    >
                      {item.label}
                      <span className="ml-1 text-[10px]">
                        {openDropdown === item.label ? "&#9652;" : "&#9662;"}
                      </span>
                    </button>
                    {openDropdown === item.label && (
                      <div className="pl-6 space-y-1">
                        {item.children.map((child) => (
                          <a
                            key={child.href}
                            href={child.href}
                            className="block px-3 py-1.5 text-sm text-white/70 hover:text-amber-400 transition-colors"
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
                    className={`block px-3 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${
                      isActive(item)
                        ? "text-amber-400"
                        : "text-white/90 hover:text-amber-400"
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
                className="block px-3 py-2 text-sm font-medium uppercase tracking-wider text-white/90 hover:text-amber-400 transition-colors"
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
