"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, Info, Mail, Phone, ShoppingBag, X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

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

const moreChildren: NavItem[] = [
  { label: "Otázky a odpovědi", href: "/otazky-a-odpovedi" },
  { label: "Tvorba", href: "/tvorba" },
  { label: "Kontakt", href: "/kontakt" },
];

const mobileNavItems: NavItem[] = [
  ...mainNavItems,
  ...moreChildren,
];

export function PublicNav() {
  const currentPath = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(mainNavItems.length);
  const navRef = useRef<HTMLElement>(null);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const moreRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const moreWidth = moreRef.current?.offsetWidth ?? 80;
    const cartWidth = cartRef.current?.offsetWidth ?? 120;
    const reservedWidth = moreWidth + cartWidth + 16;

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

    setVisibleCount(Math.max(1, count));
  }, []);

  useEffect(() => {
    const container = desktopNavRef.current;
    if (!container) return;

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
    if (item.children?.some((c) => currentPath.startsWith(c.href))) return true;
    return false;
  }

  function toggleDropdown(label: string) {
    setOpenDropdown((prev) => (prev === label ? null : label));
  }

  function handleDropdownEnter(label: string) {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenDropdown(label);
  }

  function handleDropdownLeave() {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  }

  const visibleItems = mainNavItems.slice(0, visibleCount);
  const overflowItems = mainNavItems.slice(visibleCount);
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
      <div className="max-w-[1128px] mx-auto px-4 min-[600px]:px-[31px] nav:px-[42px]">
        <div className="flex items-center gap-[138px] nav:gap-[40px] py-[24px] min-[600px]:py-[23px] nav:py-[21px]">
          <Link
            href="/"
            className="text-[16px] min-[600px]:text-[18px] nav:text-[21px] font-light text-white whitespace-nowrap -ml-[6px] nav:ml-[-8px] tracking-tight nav:tracking-normal"
          >
            Sámo Fujera
          </Link>

          <div ref={desktopNavRef} className="hidden nav:flex items-center justify-end flex-1 min-w-0">
            {mainNavItems.map((item, index) => (
              <div
                key={item.label}
                ref={(el) => { itemRefs.current[index] = el; }}
                className={`flex items-center shrink-0 ${index >= visibleCount ? "invisible absolute" : ""}`}
                style={index >= visibleCount ? { pointerEvents: "none", position: "absolute", opacity: 0 } : undefined}
              >
                {item.children ? (
                  <>
                    <div
                      className="relative"
                      onMouseEnter={() => handleDropdownEnter(item.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      <div className="absolute -inset-x-3 -top-2 -bottom-2 z-40" />
                      <Link
                        href={item.href}
                        className={`relative z-40 nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center whitespace-nowrap ${
                          isActive(item) ? "active" : ""
                        }`}
                      >
                        {item.label}
                        <ChevronDown className="size-3.5 ml-[3px] relative -top-px" strokeWidth={2.5} />
                      </Link>

                      {index < visibleCount && openDropdown === item.label && (
                        <div className="absolute top-full left-[calc(50%-15px)] mt-[1px] z-50">
                          <div className="absolute top-0 left-[15px] -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#222]" />
                          <div className="bg-[#222] py-3 px-5 min-w-48 mt-[5px]">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="block py-2 text-[14px] font-light uppercase tracking-wider text-white/80 hover:text-[#e6bc91] transition-colors whitespace-nowrap"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="nav-separator-after" />
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors whitespace-nowrap ${
                      isActive(item) ? "active" : ""
                    } nav-separator`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}

            <div
              ref={moreRef}
              className="relative shrink-0"
              onMouseEnter={() => handleDropdownEnter("__more__")}
              onMouseLeave={handleDropdownLeave}
            >
              <div className="absolute -inset-x-3 -top-2 -bottom-2 z-40" />
              <button
                type="button"
                onClick={() => toggleDropdown("__more__")}
                className="relative z-40 nav-link px-0 py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center whitespace-nowrap"
              >
                Více
                <ChevronDown className="size-3.5 ml-[3px] relative -top-px" strokeWidth={2.5} />
              </button>

              {openDropdown === "__more__" && (
                <div className="absolute top-full left-[calc(50%-15px)] mt-[1px] z-50">
                  <div className="absolute top-0 left-[15px] -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#222]" />
                  <div className="bg-[#222] py-3 px-5 min-w-48 mt-[5px]">
                    {moreDropdownItems.map((item) =>
                      item.children ? (
                        <div key={item.label}>
                          <span className="block py-1.5 text-[14px] font-light uppercase tracking-wider text-white">
                            {item.label}
                          </span>
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block py-1 pl-4 text-[14px] font-light uppercase tracking-wider text-white/80 hover:text-[#e6bc91] transition-colors whitespace-nowrap"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block py-2 text-[14px] font-light uppercase tracking-wider text-white/80 hover:text-[#e6bc91] transition-colors whitespace-nowrap"
                        >
                          {item.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={cartRef} className="flex items-center shrink-0 mr-[6px] translate-x-[2px]">
              <span className="relative mx-4 h-[34px] w-px bg-white/35 self-center" />
              <Link
                href="/kosik"
                className="nav-link pl-[8px] py-2 text-[15.5px] font-light uppercase tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                Košík
                <ShoppingBag className="size-4 relative -top-[2px] ml-[4px]" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <div className="nav:hidden flex items-center gap-4 ml-auto mr-[2px]">
            <Link href="/kosik" className="text-white hover:text-amber-400 transition-colors">
              <ShoppingBag className="size-[22px]" strokeWidth={1.5} />
            </Link>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="nav:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-[80%] bg-white shadow-xl overflow-y-auto">
            <div className="flex justify-end items-center h-[74px] pr-[16px]">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-[#c0c0c0] hover:text-gray-500 transition-colors"
                aria-label="Zavřít menu"
              >
                <X className="size-[18px]" strokeWidth={2.5} />
              </button>
            </div>
            <nav className="px-[20px]">
              {mobileNavItems.map((item) => (
                <div key={item.label} className="border-t border-gray-200 pl-[8px]">
                  {item.children ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Link
                          href={item.href}
                          className={`flex-1 py-[13px] text-[14px] font-light uppercase tracking-wider transition-colors ${
                            isActive(item) || openDropdown === item.label ? "text-[#e6bc91]" : "text-gray-400"
                          }`}
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleDropdown(item.label)}
                          className="py-[13px] pl-[10px] pr-[8px]"
                          aria-label={`Rozbalit ${item.label}`}
                        >
                          {openDropdown === item.label ? (
                            <ChevronDown className="size-[18px] text-gray-500 pointer-events-none" strokeWidth={1.5} />
                          ) : (
                            <ChevronRight className="size-[18px] text-gray-500 pointer-events-none" strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                      {openDropdown === item.label && (
                        <div className="-ml-[8px]">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block border-t border-gray-200 py-[13px] pl-[16px] text-[14px] font-light uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`block py-[13px] text-[14px] font-light uppercase tracking-wider transition-colors ${
                        isActive(item) ? "text-[#e6bc91]" : "text-gray-400"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="border-t border-gray-200" />
            </nav>
            <div className="px-[20px] pt-8 pb-6 space-y-6">
              <a
                href="mailto:info@samfujera.cz"
                className="flex items-center gap-3 text-[14px] text-[rgb(230,188,145)] hover:text-[rgb(245,210,170)] transition-colors underline decoration-[rgba(230,188,145,0.5)] underline-offset-4"
              >
                <Mail className="size-[18px] text-gray-300" strokeWidth={1.5} />
                info@samfujera.cz
              </a>
              <a
                href="tel:+420728137626"
                className="flex items-center gap-3 text-[14px] text-[rgb(230,188,145)] hover:text-[rgb(245,210,170)] transition-colors underline decoration-[rgba(230,188,145,0.5)] underline-offset-4"
              >
                <Phone className="size-[18px] text-gray-300" strokeWidth={1.5} />
                + 420 728 137 626
              </a>
              <span className="flex items-center gap-3 text-[14px] text-gray-400">
                <Info className="size-[18px] text-gray-300" strokeWidth={1.5} />
                Volejte pondělí-pátek 10.00-17.00 hodin
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
