import Link from "next/link";

export function Footer() {
  return (
    <div className="px-2 pb-2 nav:px-4 nav:pb-4">
      <footer
        className="bg-repeat"
        style={{ backgroundImage: "url('/images/bg-pattern-green.jpg')" }}
      >
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-[hsla(0,0%,100%,.7)] font-extralight"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <p className="text-[1.075rem] leading-[1.8] mb-6">
            Tento prostor vznikl jako místo pro klidné zkoumání života, těla
            a&nbsp;souvislostí, které běžně zůstávají stranou.
          </p>
          <p className="text-[1.075rem] leading-[1.8] mb-8">
            Sámo Fujera &ndash; živá setkání, přednášky, konzultace
            a&nbsp;autorská tvorba.
          </p>
          <nav className="flex flex-col items-center gap-3 mb-8">
            <Link
              href="/muj-ucet"
              className="text-[1.14rem] font-normal underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Vstoupit do členské části
            </Link>
            <Link
              href="/kontakt"
              className="text-[1.14rem] font-normal underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Kontakt
            </Link>
            <Link
              href="/pravidla-ochrany-soukromi"
              className="text-sm underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Zásady ochrany osobních údajů
            </Link>
            <Link
              href="/obchodni-podminky"
              className="text-sm underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Obchodní podmínky
            </Link>
          </nav>
          <p className="text-sm opacity-70">
            &copy; {new Date().getFullYear()} Sámo Fujera
            <span className="mx-2">&middot;</span>
            <a
              href="#"
              className="underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Cookies
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
