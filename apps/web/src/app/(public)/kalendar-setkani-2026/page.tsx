import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalendář setkání 2026 | Sámo Fujera",
  description:
    "Přehled setkání v roce 2026. Filozofické besedy, meditace a další pravidelná setkání na jednom místě.",
  keywords:
    "kalendář setkání 2026, online setkání 2026, filozofické besedy 2026, online meditace 2026, duchovní setkání online, přehled termínů, dovolená, Sámo Fujera",
};

export default function KalendarSetkaniPage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        <section>
          <h2 className="public-h2-sm pb-3.5">Kalendář setkání 2026</h2>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">
            Přednášky&nbsp;– z&nbsp;cyklu &bdquo;O&nbsp;čem se nemluví&ldquo;
          </h2>
          <div className="space-y-4 public-body-110">
            <p>
              Pravidelná online setkání každou neděli v&nbsp;16:30
            </p>
            <p>Délka: 60 minut</p>
            <ul className="public-list space-y-1 mt-4">
              <li>15. února 2026</li>
              <li>15. března 2026</li>
              <li>19. dubna 2026</li>
            </ul>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Filozofické besedy</h2>
          <div className="space-y-4 public-body-110">
            <p>
              Pravidelná online setkání každou neděli v&nbsp;18:00
            </p>
            <p>Délka: 90 minut</p>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Meditace</h2>
          <div className="space-y-4 public-body-110">
            <p>První středa v&nbsp;měsíci ve 20:00</p>
            <p>Délka: 30 minut</p>
            <ul className="public-list space-y-1 mt-4">
              <li>4. března 2026</li>
              <li>1. dubna 2026</li>
              <li>6. května 2026</li>
            </ul>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">
            Semináře a&nbsp;kurzy
          </h2>
          <div className="space-y-4 public-body-110">
            <p>Sobotní online setkání v&nbsp;10:00</p>
            <p>Délka: 120 minut</p>
            <ul className="public-list space-y-1 mt-4">
              <li>21. února 2026&nbsp;– seminář se připravuje</li>
            </ul>
          </div>
        </section>

        <hr className="border-black/20 -mx-20 mt-5 mb-5" />

        <section>
          <h2 className="public-h2-sm pb-3.5">Dovolená se Sámem</h2>
          <div className="space-y-4 public-body-110">
            <p>Osobní setkání na 6 dní</p>
            <ul className="public-list space-y-1 mt-4">
              <li>2.–7. srpna 2026</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  );
}
