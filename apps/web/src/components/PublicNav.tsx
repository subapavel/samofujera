import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ShoppingBag } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

// Main nav items (without "Více" — that's generated dynamically as overflow)
const mainNavItems: NavItem[] = [
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
];

// Items always in "Více" dropdown
const moreChildren: NavItem[] = [
  { label: "Otázky a odpovědi", href: "/otazky-a-odpovedi" },
  { label: "Tvorba", href: "/tvorba" },
  { label: "Kontakt", href: "/kontakt" },
];

// All items for mobile menu (flat list)
const allNavItems: NavItem[] = [
  ...mainNavItems,
  {
    label: "Více",
    href: "#",
    children: moreChildren,
  },
];

interface PublicNavProps {
  currentPath: string;
}

export function PublicNav({ currentPath }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(mainNavItems.length);
  const navRef = useRef<HTMLElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const moreRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const calculateVisibleItems = useCallback(() => {
    const container = desktopNavRef.current;
    if (!container || container.offsetParent === null) return;

    const containerWidth = container.offsetWidth;
    // Reserve space for "Více" button + separator + košík
    const moreWidth = moreRef.current?.offsetWidth ?? 80;
    const cartWidth = cartRef.current?.offsetWidth ?? 120;
    const reservedWidth = moreWidth + cartWidth + 16; // 16px for separator margins

    let usedWidth = 0;
    let count = 0;

    for (let i = 0; i < mainNavItems.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const itemWidth = el.offsetWidth;
      if (usedWidth + itemWidth + reservedWidth > containerWidth) break;
      usedWidth += itemWidth;
      count++;
    }

    // Always show at least 1 item
    setVisibleCount(Math.max(1, count));
  }, []);

  useEffect(() => {
    const container = desktopNavRef.current;
    if (!container) return;

    // Initial calculation after fonts load
    const timer = setTimeout(calculateVisibleItems, 100);

    const observer = new ResizeObserver(() => {
      calculateVisibleItems();
    });
    observer.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [calculateVisibleItems]);

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

  // Visible items in the nav bar
  const visibleItems = mainNavItems.slice(0, visibleCount);
  // Overflow items that go into "Více"
  const overflowItems = mainNavItems.slice(visibleCount);
  // Build "Více" dropdown children: overflow items (as links or sub-menus) + always-present children
  const moreDropdownItems: NavItem[] = [
    ...overflowItems,
    ...moreChildren,
  ];

  return (
    <nav
      ref={navRef}
      className="relative bg-repeat"
      style={{
        backgroundImage: "url('/images/bg-pattern-green.jpg')",
        fontFamily: "'Josefin Sans', sans-serif",
      }}
    >
      <div className="max-w-[1108px] mx-auto px-4 nav:px-8">
        <div className="flex items-center gap-[138px] nav:gap-[40px] py-[25px] nav:py-[21px]">
          {/* Logo */}
          <a
            href="/"
            className="text-[16px] nav:text-[21px] font-light text-white whitespace-nowrap -ml-[6px] nav:ml-[-8px] tracking-tight nav:tracking-normal"
          >
            Sámo Fujera
          </a>

          {/* Desktop nav */}
          <div ref={desktopNavRef} className="hidden nav:flex items-center justify-end flex-1 min-w-0">
            {mainNavItems.map((item, index) => (
              <div
                key={item.label}
                ref={(el) => { itemRefs.current[index] = el; }}
                className={`relative shrink-0 ${index >= visibleCount ? "invisible absolute" : ""}`}
                style={index >= visibleCount ? { pointerEvents: "none", position: "absolute", opacity: 0 } : undefined}
              >
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    className={`nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center whitespace-nowrap ${
                      isActive(item) ? "active" : ""
                    } nav-separator`}
                  >
                    {item.label}
                    <ChevronDown className="size-3.5 ml-[3px] relative -top-px" strokeWidth={2.5} />
                  </button>
                ) : (
                  <a
                    href={item.href}
                    className={`nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors whitespace-nowrap ${
                      isActive(item) ? "active" : ""
                    } nav-separator`}
                  >
                    {item.label}
                  </a>
                )}

                {/* Dropdown for items with children (only visible ones) */}
                {index < visibleCount && item.children && openDropdown === item.label && (
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

            {/* "Více" overflow menu — always visible */}
            <div ref={moreRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown("__more__")}
                className="nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center whitespace-nowrap"
              >
                Více
                <ChevronDown className="size-3.5 ml-[3px] relative -top-px" strokeWidth={2.5} />
              </button>

              {openDropdown === "__more__" && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded shadow-lg py-2 min-w-48 z-50">
                  {moreDropdownItems.map((item) =>
                    item.children ? (
                      <div key={item.label}>
                        <span className="block px-4 py-2 text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                        {item.children.map((child) => (
                          <a
                            key={child.href}
                            href={child.href}
                            className="block px-6 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <a
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        {item.label}
                      </a>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Separator + Košík */}
            <div ref={cartRef} className="flex items-center shrink-0 mr-[6px] translate-x-[2px]">
              <span className="relative mx-4 h-[34px] w-px bg-white/35 self-center" />
              <a
                href="/kosik"
                className="nav-link pl-[8px] py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                Košík
                <ShoppingBag className="size-4 relative -top-[2px] ml-[4px]" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Mobile cart + hamburger */}
          <div className="nav:hidden flex items-center gap-4 ml-auto mr-[2px]">
            <a href="/kosik" className="text-white hover:text-amber-400 transition-colors">
              <ShoppingBag className="size-[22px]" strokeWidth={1.5} />
            </a>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-0"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-[26px] w-[26px]"
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
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="nav:hidden bg-[var(--primary)]/95 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {allNavItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleDropdown(item.label)}
                      className={`nav-link w-full text-left px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors ${
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
                    className={`nav-link block px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors ${
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
                className="nav-link block px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors"
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
