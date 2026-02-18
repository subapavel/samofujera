import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Objednávka online konzultace",
  description: "Objednejte se na online konzultaci se Samem.",
  keywords:
    "objednávání na online konzultaci, poradna, objednat, objednat do poradny, online konzultace, Sam, se Samem",
};

export default function ObjednatKonzultaciPage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">Přihláška na konzultaci</h2>
          <p className="public-body-110">
            Vyberte si formu konzultace, která vám vyhovuje.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Online konzultace</h2>
          <ul className="public-list space-y-1 mt-4">
            <li>Půlhodinová online konzultace</li>
            <li>Hodinová online konzultace</li>
          </ul>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">Osobní konzultace</h2>
          <ul className="public-list space-y-1 mt-4">
            <li>Půlhodinová osobní konzultace</li>
            <li>Hodinová osobní konzultace</li>
          </ul>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">E-mailová konzultace</h2>
          <ul className="public-list space-y-1 mt-4">
            <li>Konzultace e-mailem</li>
            <li>Fotografie k&nbsp;e-mailové konzultaci</li>
          </ul>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <p className="public-body-110">
            Konzultace probíhá bez platby předem&nbsp;— úhrada následuje až po
            jejím ukončení.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <p className="public-body-110">
            <strong>Objednávkový formulář bude brzy k&nbsp;dispozici.</strong>
            <br />
            Prozatím nás prosím kontaktujte přímo.
          </p>
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
