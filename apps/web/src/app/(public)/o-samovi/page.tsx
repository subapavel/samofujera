import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sámo Fujera – filozofický pohled na život, tělo a vědomí",
  description:
    "Sámo Fujera – filozof, průvodce a pozorovatel přírodních zákonitostí života. Setkání, texty a konzultace vycházející z přímé zkušenosti a praxe.",
  keywords:
    "Sámo Fujera, filozofie života, přirozené zákony, zdraví a vědomí, otázky a odpovědi o životě, filozofický pohled",
};

export default function OSamoviPage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">Sámo Fujera</h2>
          <p className="public-body-110">Zakladatel Reálné psychologie</p>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Kým je Sámo Fujera</h2>
          <div className="space-y-4 public-body-110 text-justify">
            <p>
              Sámo Fujera se dlouhodobě věnuje porozumění souvislostem mezi
              tělem, životem a&nbsp;přirozenými zákony.
            </p>
            <p>
              Jeho práce nevychází z&nbsp;naučených systémů ani metod, ale
              z&nbsp;přímé zkušenosti, pozorování, vědeckých faktů a&nbsp;praxe.
            </p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Jak probíhá setkávání</h2>
          <div className="space-y-4 public-body-110 text-justify">
            <p>
              Setkání mají různé formy&nbsp;– přednášky, besedy, konzultace
              i&nbsp;skupinové pobyty.
            </p>
            <p>
              Společným jmenovatelem je jednoduchost, pravdivost a&nbsp;respekt
              k&nbsp;individuální cestě.
            </p>
          </div>
        </section>

        <section>
          <Link href="/jak-probihaji-konzultace" className="public-cta">
            Jak probíhají konzultace
          </Link>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Reálná psychologie</h2>
          <div className="space-y-4 public-body-110 text-justify">
            <p>
              Reálná psychologie je přístup založený na pozorování skutečného
              fungování člověka&nbsp;– těla, psychiky a&nbsp;životních okolností
              v&nbsp;jejich vzájemné souvislosti.
            </p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <Link href="/objednat-online-konzultaci" className="public-cta">
            Objednat konzultaci
          </Link>
        </section>
      </div>
    </section>
  );
}
