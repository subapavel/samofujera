import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Jak probíhají konzultace",
  description:
    "Pár kroků co dělat, když se chci objednat na online konzultaci.",
  keywords:
    "jak probíhají konzultace, poradna, poradenství, jak se přihlásit",
};

export default function JakProbihajKonzultacePage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">Jak konzultace probíhá</h2>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">1. Setkání</h2>
          <p className="public-body-110 text-justify">
            Konzultace probíhá formou rozhovoru. Není třeba se připravovat ani
            vědět, co přesně říct.
          </p>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">2. Společné zkoumání</h2>
          <p className="public-body-110 text-justify">
            Pozornost směřujeme k&nbsp;tomu, co se děje a&nbsp;objevuje&nbsp;–
            slovům, pocitům, tělesným reakcím i&nbsp;životním okolnostem.
          </p>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">
            3. Porozumění souvislostem
          </h2>
          <p className="public-body-110 text-justify">
            Postupně se ukazuje, jak spolu jednotlivé roviny souvisejí
            a&nbsp;kde se ztrácí rovnováha.
          </p>
        </section>

        <section>
          <h2 className="public-h2-sm mt-4 pb-3.5">
            4. Přirozený další krok
          </h2>
          <p className="public-body-110 text-justify">
            Z&nbsp;porozumění často vyplyne změna postoje, rozhodnutí nebo směr,
            který je možné nést bez tlaku.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">
            Forma a&nbsp;délka konzultací
          </h2>
          <ul className="public-list space-y-1 mt-4">
            <li>Osobně (dle domluvy)</li>
            <li>Online (videohovor)</li>
            <li>E-mail</li>
            <li>Délka setkání: 30 nebo 60 minut</li>
          </ul>
          <p className="public-body-110 mt-4 text-justify">
            Online konzultace probíhají přes běžně dostupné aplikace (Webex nebo
            WhatsApp), aby pro vás byla technická stránka co nejjednodušší.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">
            Frekvence a&nbsp;počet setkání
          </h2>
          <p className="public-body-110">
            Někdy stačí jedno setkání, jindy je užitečné se sejít opakovaně.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Jak zvolit délku setkání</h2>
          <div className="space-y-4 public-body-110 text-justify">
            <p>
              <strong>30 minut</strong>
              <br />
              Pokud chcete nahlédnout, zeptat se, nebo se teprve zorientovat.
            </p>
            <p>
              <strong>60 minut</strong>
              <br />
              Vhodné tehdy, když cítíte, že téma je hlubší, dlouhodobé nebo že
              potřebuje víc než rychlou odpověď.
            </p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">
            Objednání a&nbsp;domluva
          </h2>
          <p className="public-body-110">
            Termín je možné domluvit e-mailem, telefonicky, nebo přes formulář.
          </p>
        </section>

        <section>
          <Link href="/objednat-online-konzultaci" className="public-cta">
            Objednat konzultaci
          </Link>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Dárkový poukaz</h2>
          <ul className="public-list space-y-1 mt-4">
            <li>Formát: PDF</li>
            <li>Délka: 60 minut (online/osobně)</li>
            <li>Cena: 1&nbsp;900 Kč</li>
            <li>Platnost: 2 měsíce od vystavení</li>
          </ul>
        </section>
      </div>
    </section>
  );
}
