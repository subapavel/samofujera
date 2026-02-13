# 🧘 Sámo Fujera — Kompletní architektura platformy

> **Verze:** 1.0
> **Datum:** 14. února 2026
> **Status:** Analytická fáze

---

## 1. Přehled projektu

### 1.1 Vize

Kompletní přestavba stávajícího webu [samofujera.cz](https://www.samofujera.cz/) (Webnode) na moderní platformu pro prodej a distribuci digitálního i fyzického obsahu s členským systémem. Platforma soloprenéra zaměřená na osobní rozvoj, zdraví a duchovní růst.

### 1.2 Typy produktů

| Typ | Příklady | Distribuce |
|-----|----------|-----------|
| **Digitální stažení** | Ebooky (PDF/EPUB), meditace (MP3), záznamy přednášek | Signed URL z Cloudflare R2 |
| **Streamovaný obsah** | Webináře (live), záznamy webinářů, video přednášky | Cloudflare Stream + signed tokeny |
| **Fyzické produkty** | Knihy, brožury (s variantami, doručením) | Manuální fulfillment → API integrace |
| **Členství** | Přístup k placeným článkům (Medium-style paywall) | Stripe subscription + Entitlement |
| **Akce/Eventy** | Meditace, besedy, kurzy vaření, dovolená se Samem | Registrace + platba, kapacita, waitlist |
| **Poukazy** | Dárkový poukaz na částku | Unikátní kód, konfigurovatelná expirace |
| **Konzultace** *(budoucí fáze)* | Osobní/online konzultace | Booking systém s kalendářem |

### 1.3 Klíčové požadavky

- Multi-jazyk (CZ + SK, připraveno pro další) s korektními plurály a lokalizací
- Multi-měna
- Ochrana digitálního obsahu (signed URLs, watermarking, device control)
- Kontrola přístupu z vícero zařízení (1 concurrent session na přednáškách)
- Agilní vývoj — CI/CD od prvního dne, fáze po fázi na produkci
- TDD přístup, standardizované commity
- Feature flags od začátku
- GDPR — self-service smazání účtu

---

## 2. Brand & Design System

### 2.1 Identita

Na základě existující stránky samofujera.cz:

- **Charakter:** Klidný, meditativní, osobní, autentický
- **Vizuál:** Minimalistický, hodně bílého prostoru, teplé přírodní tóny
- **Typografie:** Čistá, čitelná, lehká — žádné těžké fonty
- **Fotografie:** Příroda, klid, osobní fotky Sáma

### 2.2 Barevná paleta (návrh vycházející z aktuálního webu)

```
Primary:
  --color-earth:       #8B7355    (teplá hnědá — hlavní akcent)
  --color-earth-light: #A89478    (světlejší varianta)
  --color-earth-dark:  #6B5640    (tmavší varianta)

Neutral:
  --color-cream:       #F8F5F0    (pozadí)
  --color-warm-white:  #FDFCFA    (světlé pozadí)
  --color-stone:       #E8E2DA    (bordery, oddělovače)
  --color-text:        #3D3530    (hlavní text — teplá tmavá)
  --color-text-light:  #7A7068    (sekundární text)

Accent:
  --color-sage:        #8FA387    (přírodní zelená — CTA, úspěch)
  --color-sage-light:  #B5C4AF    (hover stavy)

Semantic:
  --color-error:       #C4756A    (tlumená červená)
  --color-warning:     #D4A76A    (teplá žlutá)
  --color-success:     #8FA387    (sage green)
  --color-info:        #7A9BB5    (tlumená modrá)
```

### 2.3 Tailwind konfigurace

```javascript
// tailwind.config.js — sdílený v turborepo
export default {
  theme: {
    extend: {
      colors: {
        earth: {
          DEFAULT: '#8B7355',
          light: '#A89478',
          dark: '#6B5640',
        },
        cream: '#F8F5F0',
        stone: '#E8E2DA',
        sage: {
          DEFAULT: '#8FA387',
          light: '#B5C4AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],   // pro články a citáty
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
    },
  },
}
```

### 2.4 shadcn/ui theme

shadcn/ui se nakonfiguruje s vlastními CSS proměnnými, aby respektoval výše uvedenou paletu. Komponenty budou mít zaoblené rohy (radius: 0.5rem), jemné stíny a teplé tóny místo výchozích studených.

---

## 3. Tech Stack

### 3.1 Frontend

| Technologie | Účel |
|-------------|------|
| **Astro** | Statické stránky, SSR, SEO, hybridní rendering |
| **React 19** | Interaktivní ostrůvky, admin SPA, zákaznický portál |
| **TanStack Router** | SPA routing pro `/admin/*` a `/dashboard/*` |
| **TanStack Query** | Server state management, caching, optimistic updates |
| **shadcn/ui** | Komponentová knihovna (přizpůsobená brandu) |
| **Tailwind CSS** | Utility-first styling |
| **Lingui** | i18n — ICU MessageFormat, plurály, lokalizace |
| **React Email** | Branded HTML email šablony |
| **Turborepo** | Monorepo management |

### 3.2 Backend

| Technologie | Účel |
|-------------|------|
| **Java 25** (LTS) | Runtime |
| **Spring Boot 4** | Framework |
| **Spring Security** | Autentizace, autorizace, session management |
| **Spring Session** | Persistent sessions v Redis (30denní TTL) |
| **Spring Modulith 2** | Modulární architektura, event-driven komunikace |
| **JOOQ** | Typově bezpečný SQL, code generation ze schema |
| **Flyway** | Databázové migrace |
| **Testcontainers** | Integrační testy s reálnou DB |

### 3.3 Infrastruktura

| Služba | Účel |
|--------|------|
| **Fly.io** (WAW region) | Backend hosting, PostgreSQL, Redis |
| **Cloudflare Pages** | Frontend hosting |
| **Cloudflare R2** | File storage (ebooky, audio, assets) |
| **Cloudflare Stream** | Video streaming |
| **Stripe** | Platby (jednorázové + subscriptions) |
| **Resend** | Transactional emaily (produkce) |
| **Mailpit** | Email testing (lokální dev) |
| **GitHub Actions** | CI/CD pipeline |

---

## 4. Monorepo struktura (Turborepo)

```
samofujera/
├── .github/
│   └── workflows/
│       ├── backend.yml                # CI/CD Spring Boot → Fly.io
│       ├── frontend.yml               # CI/CD Astro → Cloudflare Pages
│       └── commitlint.yml             # Validace conventional commits
│
├── apps/
│   ├── web/                           # Astro aplikace (veřejný web)
│   │   ├── src/
│   │   │   ├── layouts/
│   │   │   │   ├── BaseLayout.astro
│   │   │   │   ├── MarketingLayout.astro
│   │   │   │   └── ArticleLayout.astro
│   │   │   ├── pages/
│   │   │   │   ├── index.astro                    # Homepage
│   │   │   │   ├── o-samovi.astro                 # Statická
│   │   │   │   ├── kontakt.astro                  # Statická
│   │   │   │   ├── konzultace.astro               # Statická (MVP)
│   │   │   │   ├── otazky-a-odpovedi.astro        # Statická
│   │   │   │   ├── obchodni-podminky.astro        # Statická
│   │   │   │   ├── pravidla-ochrany-soukromi.astro
│   │   │   │   ├── clenstvi.astro                 # Plány členství
│   │   │   │   ├── katalog/
│   │   │   │   │   ├── index.astro                # Katalog produktů
│   │   │   │   │   └── [slug].astro               # Detail produktu
│   │   │   │   ├── clanky/
│   │   │   │   │   ├── index.astro                # Seznam článků
│   │   │   │   │   └── [slug].astro               # Článek + paywall
│   │   │   │   ├── akce/
│   │   │   │   │   ├── index.astro                # Kalendář akcí
│   │   │   │   │   └── [slug].astro               # Detail akce
│   │   │   │   ├── poukazy.astro                  # Nákup poukazu
│   │   │   │   ├── auth/
│   │   │   │   │   ├── prihlaseni.astro
│   │   │   │   │   ├── registrace.astro
│   │   │   │   │   ├── zapomenute-heslo.astro
│   │   │   │   │   └── smazat-ucet.astro
│   │   │   │   ├── pokladna/
│   │   │   │   │   ├── uspech.astro
│   │   │   │   │   └── zruseno.astro
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── [...all].astro             # → React SPA shell
│   │   │   │   └── admin/
│   │   │   │       └── [...all].astro             # → React SPA shell
│   │   │   ├── components/
│   │   │   │   └── astro/                         # Statické Astro komponenty
│   │   │   │       ├── Header.astro
│   │   │   │       ├── Footer.astro
│   │   │   │       ├── ProductCard.astro
│   │   │   │       ├── ArticleCard.astro
│   │   │   │       ├── EventCard.astro
│   │   │   │       ├── PricingTable.astro
│   │   │   │       └── PaywallBanner.astro
│   │   │   └── middleware/
│   │   │       └── auth.ts                        # Session ověření pro SSR
│   │   ├── astro.config.mjs
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   ├── admin/                         # React SPA — administrace
│   │   ├── src/
│   │   │   ├── routes/                # TanStack Router
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx                      # Dashboard
│   │   │   │   ├── produkty/
│   │   │   │   │   ├── index.tsx                  # Seznam produktů
│   │   │   │   │   ├── novy.tsx                   # Nový produkt
│   │   │   │   │   └── $id.tsx                    # Edit produktu
│   │   │   │   ├── clanky/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── novy.tsx
│   │   │   │   │   └── $id.tsx
│   │   │   │   ├── akce/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── nova.tsx
│   │   │   │   │   └── $id.tsx
│   │   │   │   ├── objednavky/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── $id.tsx
│   │   │   │   ├── uzivatele/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── $id.tsx
│   │   │   │   ├── clenstvi/
│   │   │   │   │   └── index.tsx                  # Plány a přehled členů
│   │   │   │   ├── poukazy/
│   │   │   │   │   └── index.tsx
│   │   │   │   └── nastaveni/
│   │   │   │       ├── feature-flags.tsx
│   │   │   │       └── obecne.tsx
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   │   ├── AdminHeader.tsx
│   │   │   │   │   └── AdminLayout.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── DataTable.tsx              # TanStack Table
│   │   │   │       ├── FileUpload.tsx
│   │   │   │       └── StatCard.tsx
│   │   │   └── lib/
│   │   │       ├── api.ts
│   │   │       └── queries/                       # TanStack Query hooks
│   │   │           ├── useProducts.ts
│   │   │           ├── useArticles.ts
│   │   │           ├── useOrders.ts
│   │   │           └── useUsers.ts
│   │   └── package.json
│   │
│   └── customer/                      # React SPA — zákaznický portál
│       ├── src/
│       │   ├── routes/                # TanStack Router
│       │   │   ├── __root.tsx
│       │   │   ├── index.tsx                      # Přehled
│       │   │   ├── knihovna/
│       │   │   │   ├── index.tsx                  # Moje produkty
│       │   │   │   └── $productId.tsx             # Detail + download/stream
│       │   │   ├── objednavky/
│       │   │   │   ├── index.tsx
│       │   │   │   └── $id.tsx
│       │   │   ├── clenstvi.tsx                   # Správa členství
│       │   │   ├── akce.tsx                       # Moje registrace na akce
│       │   │   ├── poukazy.tsx                    # Moje poukazy
│       │   │   ├── profil.tsx                     # Nastavení účtu
│       │   │   └── smazat-ucet.tsx                # GDPR smazání
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── DashboardSidebar.tsx
│       │   │   │   └── DashboardLayout.tsx
│       │   │   └── shared/
│       │   │       ├── VideoPlayer.tsx            # Cloudflare Stream
│       │   │       ├── DownloadButton.tsx
│       │   │       └── DeviceWarning.tsx          # Dialog při kolizi zařízení
│       │   └── lib/
│       │       ├── api.ts
│       │       └── queries/
│       └── package.json
│
├── packages/
│   ├── ui/                            # Sdílené shadcn/ui komponenty
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/                    # Sdílený typový API klient
│   │   ├── src/
│   │   │   ├── client.ts             # Fetch wrapper s auth
│   │   │   ├── types.ts              # TypeScript typy (zrcadlí backend DTOs)
│   │   │   └── endpoints/
│   │   │       ├── auth.ts
│   │   │       ├── catalog.ts
│   │   │       ├── orders.ts
│   │   │       ├── articles.ts
│   │   │       ├── events.ts
│   │   │       ├── membership.ts
│   │   │       └── admin.ts
│   │   └── package.json
│   │
│   ├── emails/                        # React Email šablony
│   │   ├── src/
│   │   │   ├── templates/
│   │   │   │   ├── WelcomeEmail.tsx
│   │   │   │   ├── PasswordResetEmail.tsx
│   │   │   │   ├── OrderConfirmationEmail.tsx
│   │   │   │   ├── DigitalDeliveryEmail.tsx
│   │   │   │   ├── MembershipConfirmationEmail.tsx
│   │   │   │   ├── MembershipExpirationEmail.tsx
│   │   │   │   ├── ShippingTrackingEmail.tsx
│   │   │   │   ├── EventRegistrationEmail.tsx
│   │   │   │   ├── VoucherEmail.tsx
│   │   │   │   ├── AccountDeletionEmail.tsx
│   │   │   │   └── AccountBlockedEmail.tsx
│   │   │   ├── components/
│   │   │   │   ├── EmailLayout.tsx    # Branded header/footer
│   │   │   │   ├── EmailButton.tsx
│   │   │   │   └── EmailLogo.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── i18n/                          # Sdílené překlady (Lingui)
│   │   ├── src/
│   │   │   ├── locales/
│   │   │   │   ├── cs.po             # Čeština
│   │   │   │   └── sk.po             # Slovenština
│   │   │   ├── lingui.config.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── config/                        # Sdílená konfigurace
│   │   ├── tailwind/
│   │   │   └── preset.js             # Sdílený Tailwind preset (barvy, fonty)
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   │
│   └── utils/                         # Sdílené utility
│       ├── src/
│       │   ├── formatters.ts          # Formátování cen, dat (locale-aware)
│       │   ├── validators.ts          # Sdílená validace
│       │   └── constants.ts
│       └── package.json
│
├── backend/                           # Spring Boot aplikace
│   ├── src/
│   │   └── ... (viz sekce 5)
│   ├── build.gradle.kts
│   ├── Dockerfile
│   └── fly.toml
│
├── docker-compose.yml                 # Lokální dev prostředí
├── turbo.json
├── package.json
├── commitlint.config.js               # Conventional commits pravidla
└── README.md
```

---

## 5. Backend architektura (Spring Modulith)

### 5.1 Modulární struktura

```
backend/src/main/java/cz/samofujera/
├── SamoFujeraApplication.java
│
├── user/                              # 🧑 Modul: Uživatelé
│   ├── UserService.java               # Public API modulu
│   ├── UserRecord.java                # DTO (public)
│   ├── DeviceInfo.java                # DTO (public)
│   ├── internal/
│   │   ├── UserRepository.java        # JOOQ DAO
│   │   ├── SessionService.java        # Spring Session + device tracking
│   │   ├── DeviceTracker.java         # Fingerprinting, concurrent session control
│   │   └── AccountDeletionService.java # GDPR anonymizace
│   └── event/
│       ├── UserRegisteredEvent.java
│       ├── UserBlockedEvent.java
│       └── UserDeletedEvent.java
│
├── auth/                              # 🔐 Modul: Autentizace & Autorizace
│   ├── AuthController.java            # Login, register, refresh, logout
│   ├── internal/
│   │   ├── SecurityConfig.java        # Spring Security konfigurace
│   │   ├── SessionConfig.java         # Spring Session + Redis
│   │   ├── RoleEnum.java              # ADMIN, MEMBER, USER
│   │   └── AuthenticationService.java
│   └── event/
│       └── LoginEvent.java            # Pro device tracking
│
├── catalog/                           # 📦 Modul: Katalog produktů
│   ├── CatalogService.java            # Public API — čtení katalogu
│   ├── ProductManagementService.java  # Public API — CRUD (admin)
│   ├── ProductRecord.java             # DTO
│   ├── ProductType.java               # ENUM: DIGITAL, STREAMING, PHYSICAL, EVENT
│   ├── internal/
│   │   ├── ProductRepository.java     # JOOQ DAO
│   │   ├── DigitalAssetRepository.java
│   │   ├── PhysicalVariantRepository.java
│   │   ├── CategoryRepository.java
│   │   └── CloudflareR2Service.java   # Upload do R2
│   └── event/
│       └── ProductCreatedEvent.java
│
├── article/                           # 📝 Modul: Články (Medium-style)
│   ├── ArticleService.java            # Public API — čtení s paywall logikou
│   ├── ArticleManagementService.java  # Public API — CRUD (admin)
│   ├── ArticleRecord.java             # DTO
│   ├── internal/
│   │   ├── ArticleRepository.java     # JOOQ DAO
│   │   ├── ArticleCategoryRepository.java
│   │   └── PaywallResolver.java       # Rozhoduje preview vs full
│   └── event/
│       └── ArticlePublishedEvent.java
│
├── order/                             # 🛒 Modul: Objednávky
│   ├── OrderService.java              # Public API
│   ├── OrderRecord.java               # DTO
│   ├── internal/
│   │   ├── OrderRepository.java       # JOOQ DAO
│   │   ├── OrderItemRepository.java
│   │   └── OrderLifecycleService.java # Stavový automat
│   └── event/
│       ├── OrderCreatedEvent.java
│       └── OrderPaidEvent.java        # → spouští Entitlement, Email, Delivery
│
├── entitlement/                       # 🔑 Modul: Oprávnění (JÁDRO)
│   ├── EntitlementService.java        # Public API — hasAccess(), grant(), revoke()
│   ├── EntitlementRecord.java         # DTO
│   ├── SourceType.java                # ENUM: PURCHASE, SUBSCRIPTION, VOUCHER, ADMIN
│   ├── internal/
│   │   ├── EntitlementRepository.java # JOOQ DAO
│   │   └── EntitlementEventHandler.java # Reaguje na OrderPaid, SubscriptionActivated...
│   └── event/
│       ├── EntitlementGrantedEvent.java
│       └── EntitlementRevokedEvent.java
│
├── subscription/                      # 💳 Modul: Členství / Předplatné
│   ├── SubscriptionService.java       # Public API
│   ├── MembershipPlanRecord.java      # DTO
│   ├── internal/
│   │   ├── SubscriptionRepository.java
│   │   ├── MembershipPlanRepository.java
│   │   └── SubscriptionLifecycleService.java
│   └── event/
│       ├── SubscriptionActivatedEvent.java
│       ├── SubscriptionCancelledEvent.java
│       └── SubscriptionExpiredEvent.java
│
├── eventmodule/                       # 📅 Modul: Akce / Eventy
│   ├── EventService.java             # Public API
│   ├── EventManagementService.java   # Public API — CRUD (admin)
│   ├── EventRecord.java              # DTO
│   ├── internal/
│   │   ├── EventRepository.java      # JOOQ DAO
│   │   ├── RegistrationRepository.java
│   │   ├── WaitlistRepository.java
│   │   ├── CapacityManager.java      # Kapacita + konfigurovatelná waitlist
│   │   └── RegistrationService.java
│   └── event/
│       ├── EventRegistrationEvent.java
│       └── WaitlistPromotedEvent.java  # Když se uvolní místo
│
├── voucher/                           # 🎁 Modul: Poukazy
│   ├── VoucherService.java            # Public API — create, redeem, validate
│   ├── VoucherRecord.java             # DTO
│   ├── internal/
│   │   ├── VoucherRepository.java     # JOOQ DAO
│   │   ├── VoucherCodeGenerator.java  # Unikátní kódy
│   │   └── VoucherRedemptionService.java
│   └── event/
│       ├── VoucherCreatedEvent.java
│       └── VoucherRedeemedEvent.java
│
├── delivery/                          # 📬 Modul: Distribuce obsahu
│   ├── DigitalDeliveryService.java    # Signed URLs, watermarking
│   ├── StreamingService.java          # Cloudflare Stream tokeny
│   ├── ShippingService.java           # Fyzické doručení
│   ├── internal/
│   │   ├── SignedUrlGenerator.java    # R2 signed URLs
│   │   ├── WatermarkingJob.java      # Async watermarking PDF
│   │   ├── CloudflareStreamClient.java
│   │   ├── DownloadLogRepository.java
│   │   └── ShippingRecordRepository.java
│   └── event/
│       └── ShippingUpdatedEvent.java
│
├── payment/                           # 💰 Modul: Stripe integrace
│   ├── PaymentService.java            # Public API — createCheckout, createSubscription
│   ├── internal/
│   │   ├── StripeCheckoutService.java
│   │   ├── StripeWebhookHandler.java  # Zpracování všech webhooků
│   │   ├── StripeSubscriptionService.java
│   │   └── StripeConfig.java
│   └── event/
│       ├── PaymentSucceededEvent.java
│       └── PaymentFailedEvent.java
│
├── email/                             # 📧 Modul: Emaily
│   ├── EmailService.java             # Public API — send(template, data, locale)
│   ├── internal/
│   │   ├── ResendEmailSender.java    # Produkce (Resend API)
│   │   ├── MailpitEmailSender.java   # Dev (SMTP)
│   │   ├── EmailTemplateResolver.java # Načítá HTML z React Email buildu
│   │   └── EmailEventHandler.java    # Reaguje na eventy → posílá emaily
│   └── event/
│       └── EmailSentEvent.java
│
├── featureflag/                       # 🚩 Modul: Feature Flags
│   ├── FeatureFlagService.java        # Public API — isEnabled(flag), isEnabled(flag, user)
│   ├── FeatureFlagRecord.java         # DTO
│   ├── internal/
│   │   ├── FeatureFlagRepository.java # JOOQ DAO (DB tabulka)
│   │   ├── FeatureFlagCache.java      # Redis cache
│   │   └── FeatureFlagAspect.java     # AOP @FeatureFlag("name") anotace
│   └── annotation/
│       └── FeatureFlag.java           # @FeatureFlag("new-checkout-flow")
│
├── i18n/                              # 🌍 Modul: Internacionalizace
│   ├── LocaleService.java            # Public API
│   ├── internal/
│   │   ├── MessageConfig.java        # Spring MessageSource konfigurace
│   │   └── CurrencyFormatter.java    # Locale-aware formátování cen
│   └── messages/
│       ├── messages_cs.properties
│       └── messages_sk.properties
│
└── shared/                            # Sdílené utility (ne modul)
    ├── api/
    │   ├── ApiResponse.java           # Standardní response wrapper
    │   ├── PagedResponse.java         # Stránkování
    │   └── ErrorResponse.java
    ├── config/
    │   ├── CorsConfig.java
    │   ├── RedisConfig.java
    │   └── CloudflareConfig.java
    └── exception/
        ├── GlobalExceptionHandler.java
        ├── NotFoundException.java
        ├── ForbiddenException.java
        └── BusinessException.java
```

### 5.2 Event flow mezi moduly

```
┌────────┐  OrderPaidEvent  ┌──────────────┐  EntitlementGrantedEvent  ┌────────┐
│ Order  │ ───────────────► │ Entitlement  │ ─────────────────────────► │ Email  │
└────────┘                  └──────────────┘                            └────────┘
                                   ▲                                       ▲
┌──────────────┐ SubscriptionActivatedEvent                                │
│ Subscription │ ──────────────────┘                                       │
└──────────────┘                                                           │
                                                                           │
┌────────┐  EventRegistrationEvent ────────────────────────────────────────┘
│ Event  │
└────────┘

┌─────────┐  VoucherRedeemedEvent  ┌──────────────┐
│ Voucher │ ─────────────────────► │ Entitlement  │
└─────────┘                        └──────────────┘

┌────────┐  UserBlockedEvent  ┌──────────────┐
│ User   │ ──────────────────► │ Entitlement  │ (revoke all)
└────────┘         │           └──────────────┘
                   └──────────► │    Email     │ (notify user)
                                └──────────────┘

┌────────┐  UserDeletedEvent  ┌──────────┐
│ User   │ ──────────────────► │  Order   │ (anonymize)
└────────┘         │           └──────────┘
                   ├──────────► │Entitlement│ (revoke all)
                   │            └───────────┘
                   └──────────► │  Email    │ (confirmation)
                                └───────────┘
```

### 5.3 JOOQ + Flyway pipeline

```
Build pipeline:

1. Flyway migrace (src/main/resources/db/migration/)
   ↓ aplikuje se na Testcontainers PostgreSQL v build čase
2. JOOQ code generation (čte schema z Testcontainers)
   ↓ generuje třídy do build/generated-sources/jooq/
3. Kompilace Java kódu (včetně generovaných JOOQ tříd)
   ↓ typová kontrola — pokud se schema změní a query nesedí → compile error
4. Testy

build.gradle.kts:
  - jooq-codegen-gradle plugin
  - flyway-gradle plugin
  - testcontainers jako buildtime dependency
```

### 5.4 Příklad JOOQ repository

```java
// entitlement/internal/EntitlementRepository.java

@Repository
class EntitlementRepository {

    private final DSLContext dsl;

    EntitlementRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    boolean hasAccess(UUID userId, UUID productId) {
        return dsl.fetchExists(
            dsl.selectOne()
               .from(ENTITLEMENTS)
               .where(ENTITLEMENTS.USER_ID.eq(userId))
               .and(ENTITLEMENTS.PRODUCT_ID.eq(productId))
               .and(ENTITLEMENTS.REVOKED_AT.isNull())
               .and(
                   ENTITLEMENTS.EXPIRES_AT.isNull()
                   .or(ENTITLEMENTS.EXPIRES_AT.greaterThan(LocalDateTime.now()))
               )
        );
    }

    void grant(UUID userId, UUID productId, SourceType source, UUID sourceId,
               LocalDateTime expiresAt) {
        dsl.insertInto(ENTITLEMENTS)
           .set(ENTITLEMENTS.ID, UUID.randomUUID())
           .set(ENTITLEMENTS.USER_ID, userId)
           .set(ENTITLEMENTS.PRODUCT_ID, productId)
           .set(ENTITLEMENTS.SOURCE_TYPE, source.name())
           .set(ENTITLEMENTS.SOURCE_ID, sourceId)
           .set(ENTITLEMENTS.GRANTED_AT, LocalDateTime.now())
           .set(ENTITLEMENTS.EXPIRES_AT, expiresAt)
           .execute();
    }

    void revokeAll(UUID userId) {
        dsl.update(ENTITLEMENTS)
           .set(ENTITLEMENTS.REVOKED_AT, LocalDateTime.now())
           .where(ENTITLEMENTS.USER_ID.eq(userId))
           .and(ENTITLEMENTS.REVOKED_AT.isNull())
           .execute();
    }
}
```

---

## 6. Doménový model (databázové schema)

### 6.1 Entity Relationship Diagram

```
┌─────────────────┐
│     users        │
├─────────────────┤         ┌───────────────────┐
│ id (UUID) PK    │         │   user_sessions    │
│ email           │────────►│ session_id PK      │
│ password_hash   │         │ user_id FK         │
│ name            │         │ device_fingerprint │
│ role            │         │ device_name        │
│ locale (cs/sk)  │         │ ip_address         │
│ stripe_cust_id  │         │ last_active_at     │
│ avatar_url      │         │ created_at         │
│ blocked_at      │         └───────────────────┘
│ deleted_at      │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │    ┌─────────────────────┐       ┌──────────────────────┐
         │    │     products         │       │     categories       │
         │    ├─────────────────────┤       ├──────────────────────┤
         │    │ id (UUID) PK        │──────►│ id (UUID) PK         │
         │    │ title               │       │ name                 │
         │    │ slug (unique)       │       │ slug                 │
         │    │ description         │       │ parent_id FK (self)  │
         │    │ short_description   │       │ sort_order           │
         │    │ product_type        │       └──────────────────────┘
         │    │ price_amount        │
         │    │ price_currency      │       ┌──────────────────────┐
         │    │ status              │       │   digital_assets     │
         │    │ thumbnail_url       │       ├──────────────────────┤
         │    │ category_id FK      │──────►│ id (UUID) PK         │
         │    │ metadata (JSONB)    │       │ product_id FK        │
         │    │ created_at          │       │ asset_type           │
         │    │ updated_at          │       │ file_key (R2 path)   │
         │    └──────────┬──────────┘       │ file_name            │
         │               │                  │ file_size_bytes      │
         │               │                  │ mime_type            │
         │               │                  │ stream_uid           │
         │               │                  │ duration_seconds     │
         │               │                  │ sort_order           │
         │               │                  └──────────────────────┘
         │               │
         │               │                  ┌──────────────────────┐
         │               │                  │  physical_variants   │
         │               └─────────────────►├──────────────────────┤
         │                                  │ id (UUID) PK         │
         │                                  │ product_id FK        │
         │                                  │ name                 │
         │                                  │ sku                  │
         │                                  │ price_override       │
         │                                  │ weight_grams         │
         │                                  │ stock_quantity       │
         │                                  │ sort_order           │
         │                                  └──────────────────────┘
         │
         │    ┌──────────────────────┐      ┌──────────────────────┐
         ├───►│      orders          │◄─────│    order_items       │
         │    ├──────────────────────┤      ├──────────────────────┤
         │    │ id (UUID) PK         │      │ id (UUID) PK         │
         │    │ user_id FK           │      │ order_id FK          │
         │    │ status               │      │ product_id FK        │
         │    │ total_amount         │      │ variant_id FK (null) │
         │    │ currency             │      │ quantity             │
         │    │ voucher_id FK (null) │      │ unit_price           │
         │    │ discount_amount      │      │ total_price          │
         │    │ stripe_payment_id    │      │ product_snapshot     │
         │    │ stripe_invoice_id    │      │   (JSONB)            │
         │    │ billing_address(JSONB│      └──────────────────────┘
         │    │ shipping_address     │
         │    │   (JSONB, nullable)  │      ┌──────────────────────┐
         │    │ locale               │      │  shipping_records    │
         │    │ created_at           │      ├──────────────────────┤
         │    │ updated_at           │      │ id (UUID) PK         │
         │    └──────────────────────┘─────►│ order_id FK          │
         │                                  │ carrier              │
         │                                  │ tracking_number      │
         │                                  │ tracking_url         │
         │                                  │ shipped_at           │
         │                                  │ delivered_at         │
         │                                  └──────────────────────┘
         │
         │    ┌──────────────────────┐
         ├───►│   entitlements       │
         │    ├──────────────────────┤
         │    │ id (UUID) PK         │
         │    │ user_id FK           │
         │    │ product_id FK        │
         │    │ source_type          │ ── PURCHASE, SUBSCRIPTION, VOUCHER, ADMIN
         │    │ source_id            │
         │    │ granted_at           │
         │    │ expires_at (null)    │
         │    │ revoked_at (null)    │
         │    └──────────────────────┘
         │
         │    ┌──────────────────────┐      ┌──────────────────────┐
         ├───►│   subscriptions      │◄─────│  membership_plans    │
         │    ├──────────────────────┤      ├──────────────────────┤
         │    │ id (UUID) PK         │      │ id (UUID) PK         │
         │    │ user_id FK           │      │ name                 │
         │    │ plan_id FK           │      │ slug                 │
         │    │ stripe_sub_id        │      │ stripe_price_id      │
         │    │ status               │      │ interval (M/Y)       │
         │    │ current_period_start │      │ price_amount         │
         │    │ current_period_end   │      │ price_currency       │
         │    │ cancel_at (null)     │      │ features (JSONB)     │
         │    │ created_at           │      │ is_active            │
         │    └──────────────────────┘      └──────────────────────┘
         │
         │    ┌──────────────────────┐
         ├───►│     articles         │
         │    ├──────────────────────┤
         │    │ id (UUID) PK         │
         │    │ author_id FK         │
         │    │ title                │
         │    │ slug (unique)        │
         │    │ content_preview      │  ← Markdown (free pro všechny)
         │    │ content_full         │  ← Markdown (jen pro členy)
         │    │ access_level         │  ── FREE, MEMBERS_ONLY
         │    │ category_id FK       │
         │    │ status               │  ── DRAFT, PUBLISHED
         │    │ published_at         │
         │    │ tags (JSONB)         │
         │    │ created_at           │
         │    │ updated_at           │
         │    └──────────────────────┘
         │
         │    ┌──────────────────────┐      ┌──────────────────────┐
         ├───►│      events          │◄─────│  event_registrations │
         │    ├──────────────────────┤      ├──────────────────────┤
         │    │ id (UUID) PK         │      │ id (UUID) PK         │
         │    │ title                │      │ event_id FK          │
         │    │ slug (unique)        │      │ user_id FK           │
         │    │ description          │      │ order_id FK          │
         │    │ event_type           │      │ status               │
         │    │ location             │      │ registered_at        │
         │    │ location_type        │ ON/OFF│ cancelled_at        │
         │    │ starts_at            │      └──────────────────────┘
         │    │ ends_at              │
         │    │ price_amount         │      ┌──────────────────────┐
         │    │ price_currency       │      │   event_waitlist     │
         │    │ capacity             │      ├──────────────────────┤
         │    │ waitlist_enabled     │      │ id (UUID) PK         │
         │    │ waitlist_capacity    │      │ event_id FK          │
         │    │ status               │      │ user_id FK           │
         │    │ thumbnail_url        │      │ position             │
         │    │ recurring            │ bool │ added_at             │
         │    │ recurrence_rule      │ JSONB│ promoted_at (null)   │
         │    │ created_at           │      └──────────────────────┘
         │    └──────────────────────┘
         │
         │    ┌──────────────────────┐      ┌──────────────────────┐
         ├───►│     vouchers         │      │  voucher_redemptions │
         │    ├──────────────────────┤      ├──────────────────────┤
         │    │ id (UUID) PK         │─────►│ id (UUID) PK         │
         │    │ code (unique)        │      │ voucher_id FK        │
         │    │ amount               │      │ order_id FK          │
         │    │ currency             │      │ amount_used          │
         │    │ remaining_amount     │      │ redeemed_at          │
         │    │ purchased_by FK      │      └──────────────────────┘
         │    │ recipient_email      │
         │    │ recipient_name       │
         │    │ personal_message     │
         │    │ order_id FK          │
         │    │ expires_at           │
         │    │ redeemed_at (null)   │
         │    │ created_at           │
         │    └──────────────────────┘
         │
         │    ┌──────────────────────┐
         ├───►│   download_logs      │
         │    ├──────────────────────┤
         │    │ id (UUID) PK         │
         │    │ user_id FK           │
         │    │ asset_id FK          │
         │    │ ip_address           │
         │    │ user_agent           │
         │    │ downloaded_at        │
         │    └──────────────────────┘
         │
         │    ┌──────────────────────┐
         └───►│   feature_flags      │
              ├──────────────────────┤
              │ id (UUID) PK         │
              │ key (unique)         │
              │ enabled              │ bool (globální)
              │ description          │
              │ rules (JSONB)        │ (volitelné: per role, per user)
              │ created_at           │
              │ updated_at           │
              └──────────────────────┘
```

### 6.2 Klíčové indexy

```sql
-- Entitlement: hlavní access check
CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, product_id)
    WHERE revoked_at IS NULL;

-- Články: listing
CREATE INDEX idx_articles_published
    ON articles(status, published_at DESC)
    WHERE status = 'PUBLISHED';

-- Eventy: nadcházející
CREATE INDEX idx_events_upcoming
    ON events(starts_at)
    WHERE status = 'PUBLISHED' AND starts_at > NOW();

-- Objednávky: per user
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);

-- Poukazy: lookup kódu
CREATE UNIQUE INDEX idx_vouchers_code ON vouchers(code);

-- Feature flags: lookup klíče
CREATE UNIQUE INDEX idx_feature_flags_key ON feature_flags(key);

-- Sessions: device tracking
CREATE INDEX idx_sessions_user ON user_sessions(user_id, last_active_at DESC);
```

---

## 7. Autentizace & Autorizace

### 7.1 Spring Session + Persistent Session

```
Přihlášení:
  POST /api/auth/login { email, password }
    → Ověření credentials
    → Vytvoření Spring Session v Redis (TTL: 30 dní)
    → Uložení device fingerprint do user_sessions
    → Set-Cookie: SESSION=<id>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
    → Response: { user, role }

Každý request:
  Cookie: SESSION=<id>
    → Spring Session middleware načte session z Redis
    → Obnoví TTL (sliding expiration)
    → SecurityContext je k dispozici

Odhlášení:
  POST /api/auth/logout
    → Invalidace session v Redis
    → Odebrání záznamu z user_sessions
    → Clear cookie

Výhody oproti JWT:
  - Server-side revokace (okamžité odhlášení)
  - Přirozená integrace s device trackingem
  - Sliding expiration (30 dní neaktivity = odhlášení)
  - Jednodušší implementace
```

### 7.2 Device tracking & concurrent session control

```
Při přihlášení:
  1. Vygeneruj device fingerprint (User-Agent + screen + timezone hash)
  2. Zkontroluj existující aktivní sessions pro uživatele
  3. Pokud existuje jiná aktivní session:
     → Response: { conflict: true, existingDevice: "Chrome na Windows", sessionId: "..." }
     → Frontend zobrazí dialog:
       "Jste přihlášen/a na zařízení: Chrome na Windows.
        Chcete se přihlásit zde a odhlásit se z druhého zařízení?"
       [Přihlásit se zde] [Zrušit]
  4. Pokud uživatel potvrdí:
     → Invaliduj starou session
     → Vytvoř novou session
  5. U live přednášek/seminářů: WebSocket heartbeat kontroluje concurrent access

Konfigurace:
  - Běžný přístup (ebook, článek): max 3 concurrent sessions
  - Live přednáška/seminář: max 1 concurrent session (striktní)
  - Admin: bez limitu
```

### 7.3 Role

```
ADMIN
  → Plný přístup ke všem endpointům
  → Admin panel (/admin/*)

MEMBER
  → Aktivní předplatné
  → Plný přístup k článkům
  → Zákaznický portál (/dashboard/*)

USER
  → Registrovaný uživatel bez členství
  → Může kupovat produkty, akce, poukazy
  → Vidí preview článků
  → Zákaznický portál (/dashboard/*)
```

### 7.4 Blokování účtu

```
Admin akce: POST /api/admin/users/{id}/block

Validace:
  1. Má uživatel aktivní subscription?
     → ANO: 403 "Nelze blokovat uživatele s aktivním předplatným.
              Nejprve je nutné zrušit předplatné."
     → NE: pokračuj

Provedení:
  2. Set users.blocked_at = NOW()
  3. Invaliduj všechny sessions v Redis
  4. Revokuj všechny entitlements (UserBlockedEvent → EntitlementService)
  5. Odešli email s informací (UserBlockedEvent → EmailService)

Spring Security:
  - Při každém requestu zkontroluj blocked_at
  - Pokud blocked_at IS NOT NULL → 403 Forbidden
```

### 7.5 GDPR smazání účtu

```
User akce: POST /api/auth/delete-account

Validace:
  1. Má uživatel aktivní subscription?
     → ANO: "Nejprve zrušte předplatné."
  2. Potvrzení heslem

Provedení (UserDeletedEvent):
  3. Anonymizace:
     - email → "deleted-{uuid}@anonymized.local"
     - name → "Smazaný uživatel"
     - password_hash → null
     - stripe_customer_id → smaž zákazníka přes Stripe API, pak null
     - avatar_url → null
  4. Set users.deleted_at = NOW()
  5. Revokuj všechny entitlements
  6. Invaliduj všechny sessions
  7. Objednávky ZŮSTÁVAJÍ (účetní zákon, 5-10 let) — ale user je anonymizovaný
  8. Odešli potvrzovací email (na původní adresu, před anonymizací)
```

---

## 8. Platební flow (Stripe)

### 8.1 Jednorázový nákup (digitální/fyzický produkt, akce)

```
Frontend                    Backend                         Stripe
   │                          │                               │
   │ POST /api/checkout       │                               │
   │ { items[], voucherCode?} │                               │
   ├─────────────────────────►│                               │
   │                          │ Validace:                     │
   │                          │  - produkty existují a jsou   │
   │                          │    aktivní                    │
   │                          │  - fyzické: stock check       │
   │                          │  - akce: kapacita check       │
   │                          │  - voucher: validace +        │
   │                          │    výpočet slevy               │
   │                          │                               │
   │                          │ Create Order (status=PENDING) │
   │                          │                               │
   │                          │ Stripe Checkout Session       │
   │                          ├──────────────────────────────►│
   │                          │                               │
   │   { checkoutUrl }        │◄──────────────────────────────┤
   │◄─────────────────────────┤                               │
   │                          │                               │
   │ redirect to Stripe       │                               │
   ├──────────────────────────────────────────────────────────►│
   │                          │                               │
   │                          │  (zákazník platí)             │
   │                          │                               │
   │                          │  checkout.session.completed   │
   │                          │◄──────────────────────────────┤
   │                          │                               │
   │                          │ Webhook handler:              │
   │                          │  1. Order.status = PAID       │
   │                          │  2. Publish OrderPaidEvent    │
   │                          │     → Entitlement.grant()     │
   │                          │     → Email.send()            │
   │                          │     → Event.register() (akce) │
   │                          │     → Voucher.markUsed()      │
   │                          │     → Stock.decrement() (fyz) │
   │                          │                               │
   │ redirect /pokladna/uspech│                               │
   │◄─────────────────────────┤                               │
```

### 8.2 Členství (subscription)

```
POST /api/membership/subscribe { planId }
  → Create Stripe Checkout Session (mode=subscription)
  → Redirect to Stripe

Stripe webhooky (lifecycle):

  customer.subscription.created
    → Subscription záznam v DB
    → Entitlement.grant(source=SUBSCRIPTION, expires_at=period_end)
    → User.role = MEMBER
    → Email: potvrzení členství

  invoice.paid (opakující se platba)
    → Subscription.currentPeriodEnd = nové datum
    → Entitlement.expires_at = nové period_end
    → Email: potvrzení platby

  invoice.payment_failed
    → Email: upozornění, prosíme aktualizujte platební metodu
    → Grace period (Stripe retry logika)

  customer.subscription.updated
    → Sync stav (upgrade/downgrade plánu)

  customer.subscription.deleted
    → Subscription.status = CANCELLED
    → Entitlement zůstává do expires_at, pak se neobnoví
    → User.role = USER (po expiraci)
    → Email: potvrzení zrušení
```

### 8.3 Poukazy (voucher flow)

```
Nákup poukazu:
  POST /api/vouchers/purchase
  { amount, currency, recipientEmail, recipientName, personalMessage, expiresInDays }
    → Stripe Checkout Session
    → Po zaplacení: vygeneruj unikátní kód
    → Email obdarovanému s kódem a zprávou
    → Email kupujícímu s potvrzením

Uplatnění poukazu:
  POST /api/checkout { items[], voucherCode: "ABCD-1234" }
    → Validace: kód existuje, není expirovaný, má dostatečný zůstatek
    → Aplikace slevy na objednávku
    → Pokud poukaz pokryje celou částku: platba přes Stripe = $0 (nebo skip)
    → Pokud částečně: Stripe účtuje rozdíl
    → voucher.remaining_amount -= použitá částka
    → Záznam do voucher_redemptions
```

---

## 9. Distribuce digitálního obsahu

### 9.1 Stažení souborů (ebooky, meditace, záznamy)

```
GET /api/delivery/download/{assetId}
  1. Ověření session (Spring Security)
  2. EntitlementService.hasAccess(userId, productId) → true/false
  3. Rate limit check (Redis): max 5 downloads/hodinu/uživatel
  4. Generování signed URL:
     - R2 presigned URL
     - TTL: 15 minut
     - Vázáno na IP adresu
  5. Log do download_logs
  6. Response: { downloadUrl, fileName, fileSize }

Frontend:
  DownloadButton.tsx → fetch signed URL → window.location = downloadUrl
```

### 9.2 Watermarking (ebooky)

```
Při prvním stažení PDF:
  1. Async job (Spring @Async nebo event)
  2. Stáhni originál z R2
  3. Vlož watermark:
     - Metadata: userId, email, datum
     - Vizuální: jméno uživatele na každé stránce (poloprůhledné)
  4. Ulož watermarkovaný soubor do R2 (user-specific key)
  5. Cache pro opakovaná stažení

Klíč v R2:
  originals/  → čistý soubor
  watermarked/{userId}/{assetId}.pdf → personalizovaný
```

### 9.3 Video streaming

```
GET /api/delivery/stream/{assetId}/token
  1. Ověření session + entitlement
  2. Device check: max 1 concurrent stream pro live přednášky
  3. Generování Cloudflare Stream signed token:
     - sub: videoUid
     - exp: délka videa + 30min buffer
     - accessRules: [{ type: "ip.src", ip: [userIP] }]
  4. Response: { token, videoUid }

Frontend (VideoPlayer.tsx):
  <iframe src="https://customer-{code}.cloudflarestream.com/{videoUid}?token={token}" />
```

---

## 10. Článkový systém (Medium-style paywall)

### 10.1 Backend logika

```
GET /api/articles/{slug}

PaywallResolver:
  1. Načti článek z DB
  2. Pokud access_level = FREE:
     → return { ...article, content: content_full }
  3. Pokud access_level = MEMBERS_ONLY:
     → Zkontroluj session
     → Pokud přihlášen a role = MEMBER (nebo ADMIN):
         return { ...article, content: content_full, locked: false }
     → Jinak:
         return { ...article, content: content_preview, locked: true }
```

### 10.2 Frontend rendering

```
// pages/clanky/[slug].astro

Astro SSR:
  - Fetch článek z API (předá session cookie)
  - Pokud locked=false → renderuj plný článek
  - Pokud locked=true → renderuj preview + PaywallBanner (React ostrůvek)

PaywallBanner:
  - CSS gradient fade na konci preview
  - CTA: "Tento článek je dostupný pouze pro členy"
  - Tlačítka: [Stát se členem] [Přihlásit se]
```

### 10.3 MVP: obsah článků

```
Admin panel:
  - Textarea 1: "Obsah zdarma" (content_preview) — Markdown
  - Textarea 2: "Placený obsah" (content_full) — Markdown
  - Select: access_level (FREE / MEMBERS_ONLY)
  - Select: kategorie
  - Input: title, slug (auto-generated)
  - Status: DRAFT / PUBLISHED

Budoucí fáze:
  - Rich text editor (TipTap) místo textarea
  - Autor označí <!-- PAYWALL --> marker
  - Automatické generování preview
```

---

## 11. Akce / Eventy

### 11.1 Životní cyklus akce

```
DRAFT → PUBLISHED → REGISTRATION_OPEN → SOLD_OUT → IN_PROGRESS → COMPLETED → CANCELLED
                                │
                                ▼
                         WAITLIST_OPEN (pokud konfigurovatelné)
```

### 11.2 Registrace a kapacita

```
POST /api/events/{eventId}/register

CapacityManager:
  1. Zkontroluj: events.status = REGISTRATION_OPEN
  2. Počet registrací < events.capacity?
     → ANO: vytvoř registraci, přesměruj na Stripe checkout
     → NE a waitlist_enabled = true a waitlist < waitlist_capacity?
         → Přidej na waitlist, informuj uživatele emailem
     → NE: "Akce je vyprodána"

Když se uvolní místo (zrušení registrace):
  1. Existuje někdo na waitlistu?
  2. Posuň prvního z waitlistu do registrace
  3. Publish WaitlistPromotedEvent → Email s výzvou k platbě
  4. Platba musí proběhnout do 48h, jinak se místo nabídne dalšímu
```

---

## 12. Email systém

### 12.1 Architektura

```
React Email šablony (packages/emails/)
  ↓ npm run build → HTML stringy
  ↓ kopie do backend/src/main/resources/email-templates/
  ↓
EmailService.send(template, data, locale)
  ↓
  ├── DEV:  MailpitEmailSender (SMTP → localhost:1025)
  └── PROD: ResendEmailSender (Resend API)

Event-driven:
  OrderPaidEvent       → OrderConfirmationEmail + DigitalDeliveryEmail
  SubscriptionActivated → MembershipConfirmationEmail
  SubscriptionExpired   → MembershipExpirationEmail
  EventRegistration     → EventRegistrationEmail
  WaitlistPromoted      → WaitlistPromotionEmail
  VoucherCreated        → VoucherEmail
  ShippingUpdated       → ShippingTrackingEmail
  UserRegistered        → WelcomeEmail
  UserBlocked           → AccountBlockedEmail
  UserDeleted           → AccountDeletionEmail
  PasswordResetRequested → PasswordResetEmail
```

### 12.2 Lokalizace emailů

```
Každý email se renderuje v locale uživatele (cs/sk).
React Email šablony přijímají locale jako prop.
Překladové stringy sdílené z packages/i18n/.
```

---

## 13. Internacionalizace (i18n)

### 13.1 Frontend (Lingui)

```
Pravidla:
  - VŠECHNY stringy v kódu přes t() nebo <Trans>
  - I kdyby existoval zatím jen český překlad
  - .po soubory v packages/i18n/
  - ICU MessageFormat pro plurály:
    t`{count, plural, one {# položka} few {# položky} other {# položek}}`

Locale detection:
  1. URL parametr ?lang=sk
  2. Cookie preference
  3. Accept-Language header
  4. Default: cs

Formátování (locale-aware):
  - Ceny: Intl.NumberFormat (1 299 Kč / 49,99 €)
  - Datumy: Intl.DateTimeFormat (14. února 2026 / 14. februára 2026)
  - Plurály: ICU pravidla pro cs/sk
```

### 13.2 Backend (Spring MessageSource)

```
messages_cs.properties:
  order.confirmation=Vaše objednávka č. {0} byla přijata.
  membership.expired=Vaše členství vyprší {0}.

messages_sk.properties:
  order.confirmation=Vaša objednávka č. {0} bola prijatá.
  membership.expired=Vaše členstvo vyprší {0}.

Locale z:
  1. User.locale preference (uloženo v DB)
  2. Accept-Language header
  3. Default: cs
```

---

## 14. Feature Flags

### 14.1 Implementace

```
DB tabulka: feature_flags
  - key: "new-checkout-flow"
  - enabled: true/false (globální přepínač)
  - rules (JSONB): { "roles": ["ADMIN"], "userIds": ["..."] }

Redis cache: 5 min TTL (aby se změny projevily rychle)

Backend použití:

  // Programaticky
  if (featureFlagService.isEnabled("new-checkout-flow")) { ... }

  // AOP anotace
  @FeatureFlag("new-checkout-flow")
  public void newCheckoutMethod() { ... }

  // Fallback metoda
  @FeatureFlag(value = "new-checkout-flow", fallback = "oldCheckoutMethod")
  public void newCheckoutMethod() { ... }

Frontend použití:
  GET /api/feature-flags → { "new-checkout-flow": true, ... }
  Cached v TanStack Query

  const { data: flags } = useFeatureFlags();
  if (flags?.["new-checkout-flow"]) { <NewCheckout /> }
```

---

## 15. Testovací strategie (TDD)

### 15.1 Přístup

```
Red → Green → Refactor

Pro KAŽDOU novou funkcionalitu:
  1. Napiš test (unit nebo integrační)
  2. Test selže (červený)
  3. Implementuj minimum kódu pro zelený test
  4. Refaktoruj
  5. Opakuj
```

### 15.2 Backend testy

```
Unit testy (JUnit 5 + Mockito):
  - Každý Service, každá business logika
  - JOOQ queries s mockovaným DSLContext
  - Příklad: EntitlementService.hasAccess() s různými scénáři
  - Paywall resolver logika
  - Voucher validace a výpočty
  - Capacity manager logika

Integrační testy (Spring Modulith @ApplicationModuleTest + Testcontainers):
  - Každý modul testován izolovaně
  - Reálná PostgreSQL (Testcontainers)
  - Reálný Redis (Testcontainers)
  - Ověření event flow mezi moduly
  - Stripe webhook handling (mock Stripe)
  - JOOQ queries proti reálné DB
  - Příklad:
    @ApplicationModuleTest
    class OrderModuleIntegrationTest {
      @Test
      void whenOrderPaid_thenEntitlementCreated() { ... }
    }

Architekturní testy (Spring Modulith):
  - Ověření hranic modulů
  - Žádné nežádoucí závislosti mezi moduly
  - Příklad:
    @Test
    void verifyModuleStructure() {
      ApplicationModules.of(SamoFujeraApplication.class).verify();
    }
```

### 15.3 Frontend testy

```
Unit testy (Vitest):
  - React komponenty
  - Utility funkce (formatters, validators)
  - TanStack Query hooks (MSW pro mock API)
  - i18n: korektní překlady a plurály

E2E testy (Playwright):
  - Celé flow: registrace → přihlášení → nákup → stažení
  - Článkový paywall: nepřihlášený vs člen
  - Admin: vytvoření produktu → zobrazení v katalogu
  - Stripe checkout (test mode)
  - Responsivní testování (desktop + mobile)
```

### 15.4 Test infrastruktura

```
docker-compose.test.yml:
  - PostgreSQL (Testcontainers — automaticky v testech)
  - Redis (Testcontainers)
  - Mailpit (ověření odeslaných emailů)
  - Stripe CLI (webhook forwarding v test mode)
```

---

## 16. CI/CD & Deployment

### 16.1 Conventional Commits

```
Formát: <type>: <popis>

Typy (lowercase):
  feat:     nová funkcionalita
  fix:      oprava bugu
  refactor: refaktoring bez změny chování
  test:     přidání nebo úprava testů
  docs:     dokumentace
  chore:    údržba (dependencies, konfigurace)
  style:    formátování (ne CSS — kód formát)
  perf:     optimalizace výkonu
  ci:       změny v CI/CD

Příklady:
  feat: add article paywall for members
  fix: correct entitlement expiration timezone handling
  test: add integration tests for voucher redemption
  refactor: extract stripe webhook handler per event type
  chore: upgrade spring boot to 4.0.3

Enforcement:
  - commitlint + husky (lokální git hook)
  - GitHub Action: odmítne PR s nestandardním commitem
```

### 16.2 Git workflow

```
main ◄── develop ◄── feature/faze-1-auth
                  ◄── feature/faze-1-stripe
                  ◄── fix/entitlement-expiry

1. Feature branch z develop
2. Commit + push → CI testy běží
3. PR do develop → code review (i sám sobě — discipline)
4. Merge do develop → staging deploy (Cloudflare preview)
5. Fáze hotová → develop → main → production deploy
```

### 16.3 GitHub Actions — Backend

```yaml
# .github/workflows/backend.yml
name: backend ci/cd

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup java 25
      - gradle test (Testcontainers PostgreSQL + Redis)
      - upload test results

  modulith-verify:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - verify module structure (ApplicationModules.verify())

  build:
    needs: modulith-verify
    steps:
      - gradle bootJar
      - dependency vulnerability check

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - flyctl deploy --remote-only
```

### 16.4 GitHub Actions — Frontend

```yaml
# .github/workflows/frontend.yml
name: frontend ci/cd

on:
  push:
    branches: [main, develop]
    paths: ['apps/**', 'packages/**']
  pull_request:
    paths: ['apps/**', 'packages/**']

jobs:
  check:
    steps:
      - turbo lint
      - turbo typecheck
      - turbo test (vitest)
      - turbo build

  e2e:
    needs: check
    steps:
      - playwright tests

  deploy:
    needs: e2e
    if: github.ref == 'refs/heads/main'
    steps:
      - wrangler pages deploy
```

### 16.5 Commitlint Action

```yaml
# .github/workflows/commitlint.yml
name: commitlint

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: wagoid/commitlint-github-action@v5
        with:
          configFile: commitlint.config.js
```

---

## 17. Lokální development

### 17.1 docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: samofujera
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports: ['5432:5432']
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  mailpit:
    image: axllent/mailpit
    ports:
      - '1025:1025'   # SMTP
      - '8025:8025'   # Web UI (náhled emailů)

  stripe-cli:
    image: stripe/stripe-cli:latest
    command: listen --forward-to http://host.docker.internal:8080/api/stripe/webhook
    environment:
      STRIPE_API_KEY: ${STRIPE_SECRET_KEY}

volumes:
  pgdata:
```

### 17.2 Workflow

```bash
# 1. Infrastruktura
docker compose up -d

# 2. Backend
cd backend && ./gradlew bootRun --args='--spring.profiles.active=dev'
# → localhost:8080

# 3. Frontend
cd apps/web && npm run dev
# → localhost:4321

# 4. Mailpit UI
# → localhost:8025 (náhled všech odeslaných emailů)
```

---

## 18. Infrastruktura & Deployment

### 18.1 Produkční architektura

```
                       ┌────────────────────────────────────────┐
                       │             Cloudflare                  │
                       │                                         │
                       │  ┌─────────┐  ┌───────┐  ┌──────────┐ │
          ┌───────────►│  │  Pages  │  │  R2   │  │  Stream  │ │
          │            │  │ (Astro) │  │(files)│  │ (video)  │ │
          │            │  └────┬────┘  └───┬───┘  └────┬─────┘ │
 DNS      │            └───────┼───────────┼───────────┼────────┘
          │                    │           │           │
samofujera.cz ─► Cloudflare Pages         │           │
api.samofujera.cz ─┐          │           │           │
          │        │  ┌───────▼───────────▼───────────▼────────┐
          │        └─►│              Fly.io (WAW)               │
          │           │                                         │
          │           │  ┌───────────────┐  ┌───────────────┐  │
          │           │  │  Spring Boot  │  │  PostgreSQL   │  │
          │           │  │  (shared-1x)  │  │  (Fly managed)│  │
          │           │  └───────┬───────┘  └───────────────┘  │
          │           │          │                              │
          │           │  ┌───────▼───────┐                     │
          │           │  │    Redis      │                     │
          │           │  │  (Upstash)    │                     │
          │           │  └───────────────┘                     │
          │           └─────────────────────────────────────────┘
          │
          │           ┌─────────────────────────────────────────┐
          │           │            GitHub                        │
          └───────────│  Actions CI/CD                          │
                      └─────────────────────────────────────────┘

Před spuštěním (bez domény):
  Frontend: samofujera.pages.dev
  Backend:  samofujera-api.fly.dev
```

### 18.2 Fly.io konfigurace

```toml
# fly.toml
app = "samofujera-api"
primary_region = "waw"

[build]
  dockerfile = "Dockerfile"

[env]
  SPRING_PROFILES_ACTIVE = "prod"
  SERVER_PORT = "8080"
  TZ = "Europe/Prague"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

[checks]
  [checks.health]
    type = "http"
    port = 8080
    path = "/actuator/health"
    interval = "30s"
```

### 18.3 Dockerfile (multi-stage)

```dockerfile
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon || true
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+UseG1GC", "-jar", "app.jar"]
```

### 18.4 Náklady (měsíční odhad)

```
Služba                   Start         Růst (stovky uživatelů)
─────────────────────────────────────────────────────────────
Fly.io (API)             ~$5-10        ~$15-25
Fly.io PostgreSQL        ~$4           ~$7
Upstash Redis            $0 (free)     ~$5
Cloudflare Pages         $0            $0
Cloudflare R2            $0 (10GB)     ~$5
Cloudflare Stream        ~$5           ~$10-20
Stripe                   2.9% + 30¢    2.9% + 30¢
Resend                   $0 (3k/m)     ~$20
GitHub                   $0            $0
Doména                   ~$1           ~$1
─────────────────────────────────────────────────────────────
CELKEM                   ~$15-20/m     ~$60-80/m + Stripe fees
```

---

## 19. Monitoring

```
Fly.io built-in:
  - fly logs (real-time)
  - Grafana dashboard (metriky)

Spring Boot Actuator:
  - /actuator/health (Fly.io health check)
  - /actuator/metrics

Uptime monitoring (BetterStack free tier):
  - api.samofujera.cz/actuator/health
  - samofujera.cz
  → Email/SMS alert při výpadku

Error tracking (Sentry free tier):
  - Backend: Spring Boot integrace
  - Frontend: React error boundaries

Stripe Dashboard:
  - Failed payments notifikace
  - Webhook failures
```

---

## 20. MVP Roadmapa (agilní, fáze po fázi)

### Fáze 1 — Základ (Sprint 1–3)
```
□ Monorepo setup (Turborepo, packages)
□ Spring Boot 4 + Modulith skeleton
□ Flyway migrace: users, feature_flags
□ JOOQ code generation pipeline
□ Spring Security + Spring Session (Redis)
□ Auth: registrace, přihlášení, odhlášení, reset hesla
□ Device tracking (session management)
□ Astro web: homepage, statické stránky, auth stránky
□ Admin shell (React SPA v /admin)
□ Customer dashboard shell (React SPA v /dashboard)
□ Docker Compose (PostgreSQL, Redis, Mailpit)
□ CI/CD pipeline (GitHub Actions → Fly.io + Cloudflare)
□ Commitlint + Husky
□ Email: welcome, password reset (React Email + Mailpit)
□ Feature flags modul (DB + Redis cache)
□ i18n setup (Lingui frontend, MessageSource backend)
□ shadcn/ui theme (brand barvy)

→ Deploy #1: Fungující auth + prázdná platforma
```

### Fáze 2 — Katalog & Digitální prodej (Sprint 4–6)
```
□ Flyway migrace: products, digital_assets, categories, orders,
  order_items, entitlements, download_logs
□ Katalog modul: CRUD produktů, kategorie
□ Order modul: vytvoření objednávky
□ Entitlement modul: grant, hasAccess, revoke
□ Payment modul: Stripe checkout (jednorázová platba)
□ Stripe webhook handler
□ Delivery modul: signed URLs z R2, download endpoint
□ Admin: správa produktů, upload assetů, přehled objednávek
□ Frontend: katalog, detail produktu, checkout flow
□ Customer dashboard: moje produkty, knihovna, stažení
□ Email: potvrzení objednávky, digitální doručení
□ Testy: unit + integrační pro celý nákupní flow

→ Deploy #2: Funkční e-shop — MŮŽEŠ ZAČÍT PRODÁVAT
```

### Fáze 3 — Členství & Články (Sprint 7–9)
```
□ Flyway migrace: articles, membership_plans, subscriptions
□ Article modul: CRUD, paywall resolver
□ Subscription modul: Stripe subscription checkout, lifecycle
□ Stripe subscription webhooky
□ Admin: správa článků (dvě textarea + Markdown)
  správa členských plánů, přehled členů
□ Frontend: seznam článků, detail s paywallem, PaywallBanner
□ Frontend: stránka členství (pricing table)
□ Customer dashboard: správa členství (zrušení, reaktivace)
□ Email: členství potvrzení, expirační varování
□ Blokování účtu (admin) + validace na aktivní subscription
□ GDPR smazání účtu (self-service)
□ Testy

→ Deploy #3: Články + členství live
```

### Fáze 4 — Video & Streaming (Sprint 10–11)
```
□ Cloudflare Stream integrace
□ Video upload (admin)
□ Signed token generování
□ Concurrent session control (1 device pro live)
□ VideoPlayer komponenta (React)
□ PDF watermarking (async job)
□ Testy

→ Deploy #4: Video obsah live
```

### Fáze 5 — Akce & Eventy (Sprint 12–13)
```
□ Flyway migrace: events, event_registrations, event_waitlist
□ Event modul: CRUD, registrace, kapacita, waitlist
□ Admin: správa akcí, přehled registrací
□ Frontend: kalendář akcí, detail, registrace + platba
□ Customer dashboard: moje akce
□ Email: potvrzení registrace, waitlist notifikace
□ Testy

→ Deploy #5: Akce live
```

### Fáze 6 — Fyzické produkty (Sprint 14)
```
□ Flyway migrace: physical_variants, shipping_records
□ Varianty produktů (CRUD v admin)
□ Stock management
□ Shipping address v checkout
□ Admin: fulfillment dashboard, zadat tracking
□ Email: tracking notifikace
□ Testy

→ Deploy #6: Fyzické produkty live
```

### Fáze 7 — Poukazy (Sprint 15)
```
□ Flyway migrace: vouchers, voucher_redemptions
□ Voucher modul: nákup, generování kódu, uplatnění, validace
□ Frontend: nákup poukazu, uplatnění v checkoutu
□ Admin: přehled poukazů
□ Email: poukaz pro obdarovaného
□ Testy

→ Deploy #7: Poukazy live
```

### Budoucí fáze (po MVP)
```
□ Rich text editor (TipTap) pro články
□ Vizuální page builder
□ Booking systém pro konzultace (kalendář, časové sloty)
□ Zásilkovna / PPL / Česká pošta API integrace
□ Admin dashboard: pokročilé statistiky a grafy
□ SEO optimalizace (structured data, sitemap)
□ Push notifikace
□ Slovenská verze obsahu (překlad článků)
□ Další jazyky a měny
□ A/B testing (navázáno na feature flags)
```

---

## 21. API Endpointy — kompletní přehled

### Veřejné (bez autentizace)

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password

GET  /api/catalog/products                    # Stránkovaný seznam
GET  /api/catalog/products/{slug}             # Detail produktu
GET  /api/catalog/categories                  # Strom kategorií

GET  /api/articles                            # Seznam článků
GET  /api/articles/{slug}                     # Článek (s paywall logikou)

GET  /api/events                              # Nadcházející akce
GET  /api/events/{slug}                       # Detail akce

GET  /api/membership/plans                    # Dostupné plány

GET  /api/feature-flags                       # Aktivní flagy (public subset)

POST /api/stripe/webhook                      # Stripe webhooky (ověřeno podpisem)
```

### Chráněné (vyžadují session)

```
GET    /api/me                                # Profil
PUT    /api/me                                # Aktualizace profilu
PUT    /api/me/locale                         # Změna jazyka
DELETE /api/me                                # GDPR smazání účtu

POST   /api/checkout                          # Vytvořit Stripe checkout
GET    /api/orders                            # Moje objednávky
GET    /api/orders/{id}                       # Detail objednávky

GET    /api/library                           # Moje zakoupené produkty
GET    /api/library/{productId}/assets        # Assety produktu
GET    /api/delivery/download/{assetId}       # Signed URL pro stažení
GET    /api/delivery/stream/{assetId}/token   # Stream token pro video

GET    /api/membership                        # Stav mého členství
POST   /api/membership/subscribe              # Zahájit předplatné
POST   /api/membership/cancel                 # Zrušit předplatné
POST   /api/membership/reactivate             # Reaktivovat

POST   /api/events/{eventId}/register         # Registrace na akci
DELETE /api/events/{eventId}/register         # Zrušení registrace
GET    /api/me/events                         # Moje registrace

POST   /api/vouchers/purchase                 # Nákup poukazu
POST   /api/vouchers/validate                 # Ověření kódu
GET    /api/me/vouchers                       # Moje poukazy

GET    /api/me/sessions                       # Aktivní zařízení
DELETE /api/me/sessions/{sessionId}           # Odhlásit zařízení
```

### Admin (role ADMIN)

```
# Produkty
POST   /api/admin/products                    # Vytvořit
PUT    /api/admin/products/{id}               # Upravit
DELETE /api/admin/products/{id}               # Smazat (soft)
POST   /api/admin/products/{id}/assets        # Upload asset → R2
DELETE /api/admin/products/{id}/assets/{aid}  # Odebrat asset

# Články
POST   /api/admin/articles                    # Vytvořit
PUT    /api/admin/articles/{id}               # Upravit
DELETE /api/admin/articles/{id}               # Smazat (soft)

# Akce
POST   /api/admin/events                      # Vytvořit
PUT    /api/admin/events/{id}                 # Upravit
DELETE /api/admin/events/{id}                 # Zrušit
GET    /api/admin/events/{id}/registrations   # Registrace na akci
GET    /api/admin/events/{id}/waitlist        # Čekací listina

# Objednávky
GET    /api/admin/orders                      # Všechny objednávky
GET    /api/admin/orders/{id}                 # Detail
PUT    /api/admin/orders/{id}/shipping        # Zadat tracking

# Uživatelé
GET    /api/admin/users                       # Seznam uživatelů
GET    /api/admin/users/{id}                  # Detail + entitlements
POST   /api/admin/users/{id}/block            # Blokovat účet
POST   /api/admin/users/{id}/unblock          # Odblokovat
POST   /api/admin/users/{id}/entitlements     # Manuální grant
DELETE /api/admin/users/{id}/entitlements/{eid} # Revoke

# Členství
GET    /api/admin/membership/plans            # Plány
POST   /api/admin/membership/plans            # Vytvořit plán
PUT    /api/admin/membership/plans/{id}       # Upravit
GET    /api/admin/membership/subscribers      # Seznam členů

# Poukazy
GET    /api/admin/vouchers                    # Seznam poukazů
POST   /api/admin/vouchers                    # Vytvořit manuálně

# Feature Flags
GET    /api/admin/feature-flags               # Seznam
POST   /api/admin/feature-flags               # Vytvořit
PUT    /api/admin/feature-flags/{id}          # Upravit (toggle)

# Dashboard
GET    /api/admin/dashboard/stats             # Tržby, členové, objednávky
GET    /api/admin/dashboard/revenue           # Revenue za období
```

---

*Tento dokument slouží jako referenční architektura pro celý projekt Sámo Fujera. Při implementaci se z něj vychází fáze po fázi.*
