import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tvorba | Záznamy, texty a ucelené materiály Sáma Fujery",
  description:
    "Ucelené záznamy, brožury a další tvorba Sáma Fujery. Materiály vzniklé z filozofického zkoumání života, těla a vědomí, určené k opakovanému návratu.",
  keywords:
    "Sámo Fujera tvorba, záznamy přednášek, filozofické texty, semináře a kurzy záznam, brožury o zdraví a životě, vědomí, tělo, duše",
};

export default function TvorbaPage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">
            Autorské materiály Sáma Fujery
          </h2>
          <p className="public-body-110">
            Záznamy živé práce, zachycené pro další cestu a&nbsp;návraty.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <div className="space-y-4 public-body-110">
            <p>
              <strong>Katalog produktů bude brzy k&nbsp;dispozici.</strong>
            </p>
            <p>
              Připravujeme pro vás přehled všech dostupných materiálů&nbsp;–
              záznamy přednášek, semináře, kurzy, meditace, knihy a&nbsp;digitální
              texty.
            </p>
          </div>
        </section>

        <section>
          <Link href="/kontakt" className="public-cta">
            Kontaktovat nás
          </Link>
        </section>
      </div>
    </section>
  );
}
