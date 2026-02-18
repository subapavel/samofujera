import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt | Sámo Fujera",
  description:
    "Potřebujete informace nebo osobní domluvu? Kontaktujte nás. Rádi odpovídáme na Vaše dotazy a domluvíme další kroky.",
  keywords:
    "kontakt Sámo Fujera, kontakt, dotazy, informace, osobní domluva, konzultace, akce na přání, spoluprávce",
};

export default function KontaktPage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">Kontakt</h2>
          <p className="public-body-110">
            Pokud máte otázku nebo potřebujete doplnit informace, můžete nás
            kontaktovat níže.
          </p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <div className="space-y-4 public-body-110">
            <p>
              <strong>Adresa</strong>
              <br />
              K&nbsp;řece 304, Trutnov, 541 03, Česká republika
            </p>
            <p>
              <strong>Telefon</strong>
              <br />
              +420 728 137 626 (vyřizuje paní Marcelka)
              <br />
              Pondělí–pátek od 10:00 do 17:00
            </p>
            <p>
              <strong>E-mail</strong>
              <br />
              info@samfujera.cz
            </p>
            <p>
              <strong>Bankovní spojení</strong>
              <br />
              1102350399/0800, Česká spořitelna
              <br />
              IBAN: CZ8208000000001102350399
            </p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <div className="space-y-4 public-body-110">
            <p>
              <strong>IČO:</strong> 45953961
            </p>
            <p>
              Registrace v&nbsp;živnostenském rejstříku od 16.&nbsp;5.&nbsp;1995
            </p>
            <p>
              Ceník je smluvní. Nejsem plátce DPH. Neposkytuji zdravotnické
              služby.
            </p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <p className="public-body-110">
            <strong>Kontaktní formulář bude brzy k&nbsp;dispozici.</strong>
          </p>
          <p className="public-body-110 mt-4">
            Po odeslání formuláře se vám ozveme a&nbsp;domluvíme další postup.
            Odpovídáme zpravidla do několika pracovních dnů.
          </p>
        </section>
      </div>
    </section>
  );
}
