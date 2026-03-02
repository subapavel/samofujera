# Email System Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade emails from JavaMailSender SMTP + `{{placeholder}}` HTML to typed React Email components (cs/sk), Resend API delivery, DB-backed subject/body overrides, and an admin UI at `/admin/emaily`.

**Architecture:** React Email templates in `packages/emails` render to per-locale HTML files at build time. Spring backend replaces JavaMailSender with the Resend Java SDK. A new `email_template_overrides` DB table lets admins override subject + body per template per locale. A new `/admin/emaily` page lists templates and opens an edit dialog with live preview.

**Tech Stack:** React Email, TypeScript, Resend Java SDK, JOOQ, Flyway, Spring Boot 4, TanStack Query, shadcn/ui, Lingui, Next.js App Router

**Design doc:** `docs/plans/2026-03-02-email-system-redesign-design.md`

---

### Task 1: `packages/emails` — Brand Layout Component

Update the shared Layout to use Samo Fujera brand colors and Inter font.

**Files:**
- Modify: `packages/emails/src/components/Layout.tsx`

**Step 1: Replace colors and font**

Replace the entire file content:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Font,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview?: string;
  children: React.ReactNode;
  locale?: "cs" | "sk";
}

export const Layout = ({ preview, children, locale = "cs" }: LayoutProps) => (
  <Html lang={locale}>
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="Arial"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandName}>Sámo Fujera</Text>
        </Section>

        <Section style={content}>{children}</Section>

        <Hr style={divider} />

        <Section style={footer}>
          <Text style={footerText}>
            &copy; 2026 Sámo Fujera. Všechna práva vyhrazena.
          </Text>
          <Text style={footerText}>
            <a href="https://www.samofujera.cz" style={footerLink}>
              samofujera.cz
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main: React.CSSProperties = {
  backgroundColor: "#F8F5F0",
  margin: "0 auto",
  padding: "0",
  fontFamily: "Inter, Arial, sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 0",
  maxWidth: "560px",
};

const header: React.CSSProperties = {
  backgroundColor: "#8B7355",
  padding: "24px 32px",
  borderRadius: "8px 8px 0 0",
};

const brandName: React.CSSProperties = {
  margin: "0",
  color: "#FDFCFA",
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "-0.02em",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px",
};

const divider: React.CSSProperties = {
  borderColor: "#E8E2DA",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#FDFCFA",
  padding: "16px 32px",
  borderRadius: "0 0 8px 8px",
  borderTop: "1px solid #E8E2DA",
};

const footerText: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#7A7068",
  fontSize: "12px",
  textAlign: "center" as const,
  lineHeight: "20px",
};

const footerLink: React.CSSProperties = {
  color: "#8B7355",
  textDecoration: "none",
};
```

**Step 2: Verify it compiles**

```bash
cd packages/emails && pnpm tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add packages/emails/src/components/Layout.tsx
git commit -m "feat(emails): update layout with samo fujera brand colors and inter font"
```

---

### Task 2: `packages/emails` — Add i18n Translations

Create a shared translations module used by all templates.

**Files:**
- Create: `packages/emails/src/translations.ts`

**Step 1: Create translations file**

```ts
export type Locale = "cs" | "sk";

export const translations = {
  cs: {
    greeting: "Dobrý den",
    closing: "S pozdravem,\nTým Sámo Fujera",
    visitUs: "Navštivte nás na",
    defaultCta: "Přejít na web",
  },
  sk: {
    greeting: "Dobrý deň",
    closing: "S pozdravom,\nTím Sámo Fujera",
    visitUs: "Navštívte nás na",
    defaultCta: "Prejsť na web",
  },
} as const;

export function t(locale: Locale) {
  return translations[locale];
}
```

**Step 2: Verify**

```bash
cd packages/emails && pnpm tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add packages/emails/src/translations.ts
git commit -m "feat(emails): add cs/sk translation map"
```

---

### Task 3: `packages/emails` — Typed Props for All 7 Templates

Replace `{"{{placeholder}}"}` hardcoded strings with typed locale prop + translations. Keep runtime data vars (`{{name}}`, `{{orderId}}`, etc.) as literal strings since Java substitutes them at send time.

**Files:**
- Modify: `packages/emails/src/Welcome.tsx`
- Modify: `packages/emails/src/PasswordReset.tsx`
- Modify: `packages/emails/src/AccountBlocked.tsx`
- Modify: `packages/emails/src/AccountUnblocked.tsx`
- Modify: `packages/emails/src/AccountDeleted.tsx`
- Modify: `packages/emails/src/OrderConfirmation.tsx`
- Modify: `packages/emails/src/DigitalDelivery.tsx`

**Step 1: Update Welcome.tsx**

```tsx
import { Heading, Text, Button } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type WelcomeProps = { locale?: Locale };

export const Welcome = ({ locale = "cs" }: WelcomeProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Vítejte na Sámo Fujera" : "Vitajte na Sámo Fujera"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Vítejte, {{name}}!" : "Vitajte, {{name}}!"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Děkujeme za registraci na platformě Sámo Fujera. Jsme rádi, že jste se k nám přidali."
          : "Ďakujeme za registráciu na platforme Sámo Fujera. Sme radi, že ste sa k nám pridali."}
      </Text>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Vaše cesta k osobnímu růstu, zdraví a duchovnímu rozvoji právě začíná."
          : "Vaša cesta k osobnému rastu, zdraviu a duchovnému rozvoju práve začína."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#3D3530",
  fontSize: "22px",
  fontWeight: "700",
};

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#3D3530",
  fontSize: "15px",
  lineHeight: "1.6",
};

const closing: React.CSSProperties = {
  margin: "24px 0 0",
  color: "#7A7068",
  fontSize: "14px",
  lineHeight: "1.6",
  whiteSpace: "pre-line" as const,
};

export default Welcome;
```

**Step 2: Update PasswordReset.tsx**

```tsx
import { Heading, Text, Button, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type PasswordResetProps = { locale?: Locale };

export const PasswordReset = ({ locale = "cs" }: PasswordResetProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Obnova hesla" : "Obnova hesla"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Obnova hesla" : "Obnova hesla"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "{{name}}, obdrželi jsme požadavek na obnovu hesla k vašemu účtu."
          : "{{name}}, obdržali sme požiadavku na obnovu hesla k vášmu účtu."}
      </Text>
      <Section style={buttonSection}>
        <Button href="{{resetLink}}" style={button}>
          {locale === "cs" ? "Obnovit heslo" : "Obnoviť heslo"}
        </Button>
      </Section>
      <Text style={small}>
        {locale === "cs"
          ? "Odkaz je platný 1 hodinu. Pokud jste o obnovu hesla nepožádali, tento e-mail ignorujte."
          : "Odkaz je platný 1 hodinu. Ak ste o obnovu hesla nepožiadali, tento e-mail ignorujte."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 24px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const buttonSection: React.CSSProperties = { textAlign: "center" as const, margin: "0 0 24px" };
const button: React.CSSProperties = {
  backgroundColor: "#8B7355",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};
const small: React.CSSProperties = { margin: "0 0 16px", color: "#7A7068", fontSize: "13px", lineHeight: "1.5" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default PasswordReset;
```

**Step 3: Update AccountBlocked.tsx**

```tsx
import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type AccountBlockedProps = { locale?: Locale };

export const AccountBlocked = ({ locale = "cs" }: AccountBlockedProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Váš účet byl pozastaven" : "Váš účet bol pozastavený"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Váš účet byl pozastaven" : "Váš účet bol pozastavený"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Váš účet na platformě Sámo Fujera byl dočasně pozastaven. Pokud si myslíte, že jde o chybu, kontaktujte nás."
          : "Váš účet na platforme Sámo Fujera bol dočasne pozastavený. Ak si myslíte, že ide o chybu, kontaktujte nás."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default AccountBlocked;
```

**Step 4: Update AccountUnblocked.tsx**

```tsx
import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type AccountUnblockedProps = { locale?: Locale };

export const AccountUnblocked = ({ locale = "cs" }: AccountUnblockedProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Váš účet byl obnoven" : "Váš účet bol obnovený"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Váš účet byl obnoven" : "Váš účet bol obnovený"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Váš účet na platformě Sámo Fujera byl úspěšně obnoven. Nyní se můžete znovu přihlásit."
          : "Váš účet na platforme Sámo Fujera bol úspešne obnovený. Teraz sa môžete znovu prihlásiť."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default AccountUnblocked;
```

**Step 5: Update AccountDeleted.tsx**

```tsx
import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type AccountDeletedProps = { locale?: Locale };

export const AccountDeleted = ({ locale = "cs" }: AccountDeletedProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Váš účet byl smazán" : "Váš účet bol vymazaný"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Váš účet byl smazán" : "Váš účet bol vymazaný"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Potvrzujeme, že váš účet {{name}} byl úspěšně smazán. Všechna vaše osobní data byla anonymizována."
          : "Potvrdzujeme, že váš účet {{name}} bol úspešne vymazaný. Všetky vaše osobné údaje boli anonymizované."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default AccountDeleted;
```

**Step 6: Update OrderConfirmation.tsx**

```tsx
import { Heading, Text, Hr, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type OrderConfirmationProps = { locale?: Locale };

export const OrderConfirmation = ({ locale = "cs" }: OrderConfirmationProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Potvrzení objednávky" : "Potvrdenie objednávky"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Děkujeme za objednávku, {{name}}!" : "Ďakujeme za objednávku, {{name}}!"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Vaše objednávka č. {{orderId}} byla úspěšně zaplacena."
          : "Vaša objednávka č. {{orderId}} bola úspešne zaplatená."}
      </Text>
      <Hr style={divider} />
      <Text style={label}>{locale === "cs" ? "Položky:" : "Položky:"}</Text>
      <Text style={paragraph} dangerouslySetInnerHTML={{ __html: "{{items}}" } as any} />
      <Hr style={divider} />
      <Text style={total}>
        {locale === "cs" ? "Celkem: {{totalAmount}} {{currency}}" : "Celkom: {{totalAmount}} {{currency}}"}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 12px", color: "#3D3530", fontSize: "14px", lineHeight: "1.6" };
const label: React.CSSProperties = { margin: "0 0 8px", color: "#7A7068", fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const total: React.CSSProperties = { margin: "0 0 24px", color: "#3D3530", fontSize: "18px", fontWeight: "700" };
const divider: React.CSSProperties = { margin: "16px 0", borderColor: "#E8E2DA" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default OrderConfirmation;
```

**Step 7: Update DigitalDelivery.tsx**

```tsx
import { Heading, Text, Button, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type DigitalDeliveryProps = { locale?: Locale };

export const DigitalDelivery = ({ locale = "cs" }: DigitalDeliveryProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Váš digitální obsah je připraven" : "Váš digitálny obsah je pripravený"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Váš obsah je připraven, {{name}}!" : "Váš obsah je pripravený, {{name}}!"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Produkt {{productTitle}} je nyní dostupný ve vaší knihovně."
          : "Produkt {{productTitle}} je teraz dostupný vo vašej knižnici."}
      </Text>
      <Section style={buttonSection}>
        <Button href="{{libraryUrl}}" style={button}>
          {locale === "cs" ? "Přejít do knihovny" : "Prejsť do knižnice"}
        </Button>
      </Section>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 24px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const buttonSection: React.CSSProperties = { textAlign: "center" as const, margin: "0 0 24px" };
const button: React.CSSProperties = {
  backgroundColor: "#8B7355",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
};
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default DigitalDelivery;
```

**Step 8: Verify all compile**

```bash
cd packages/emails && pnpm tsc --noEmit
```

Expected: No errors.

**Step 9: Commit**

```bash
git add packages/emails/src/
git commit -m "feat(emails): add typed props and cs/sk translations to all templates"
```

---

### Task 4: `packages/emails` — Update build.ts for Per-Locale Output

**Files:**
- Modify: `packages/emails/build.ts`

**Step 1: Replace build.ts**

```ts
import { render } from "@react-email/components";
import { writeFileSync, mkdirSync } from "fs";
import React from "react";
import { Welcome } from "./src/Welcome";
import { PasswordReset } from "./src/PasswordReset";
import { AccountBlocked } from "./src/AccountBlocked";
import { AccountUnblocked } from "./src/AccountUnblocked";
import { AccountDeleted } from "./src/AccountDeleted";
import { OrderConfirmation } from "./src/OrderConfirmation";
import { DigitalDelivery } from "./src/DigitalDelivery";

const OUTPUT_DIR = "../../apps/backend/src/main/resources/templates/email";

mkdirSync(OUTPUT_DIR, { recursive: true });

const templates = [
  { name: "welcome", component: Welcome },
  { name: "password-reset", component: PasswordReset },
  { name: "account-blocked", component: AccountBlocked },
  { name: "account-unblocked", component: AccountUnblocked },
  { name: "account-deleted", component: AccountDeleted },
  { name: "order-confirmation", component: OrderConfirmation },
  { name: "digital-delivery", component: DigitalDelivery },
] as const;

const locales = ["cs", "sk"] as const;

async function build() {
  for (const { name, component: Component } of templates) {
    for (const locale of locales) {
      const html = await render(React.createElement(Component as any, { locale }));
      const outputPath = `${OUTPUT_DIR}/${name}.${locale}.html`;
      writeFileSync(outputPath, html);
      console.log(`built ${name}.${locale}.html`);
    }
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
```

**Step 2: Run the build**

```bash
cd packages/emails && pnpm build
```

Expected output:
```
built welcome.cs.html
built welcome.sk.html
built password-reset.cs.html
built password-reset.sk.html
... (14 files total)
```

Verify files exist in `apps/backend/src/main/resources/templates/email/`:

```bash
ls apps/backend/src/main/resources/templates/email/
```

Expected: 14 `.html` files (7 templates × 2 locales). Old single-locale files (`welcome.html` etc.) will still be there — delete them:

```bash
cd apps/backend/src/main/resources/templates/email && ls *.html | grep -v "\." | head -20
# Delete old single-locale files
rm -f welcome.html password-reset.html account-blocked.html account-unblocked.html account-deleted.html order-confirmation.html digital-delivery.html
```

Wait, the old files have no locale suffix so grep won't work easily. Just delete them manually:

```bash
cd /c/Users/pavol/Documents/samofujera/apps/backend/src/main/resources/templates/email
rm -f welcome.html password-reset.html account-blocked.html account-unblocked.html account-deleted.html order-confirmation.html digital-delivery.html
```

**Step 3: Commit**

```bash
git add packages/emails/build.ts apps/backend/src/main/resources/templates/email/
git commit -m "feat(emails): build per-locale html templates (cs/sk)"
```

---

### Task 5: Backend — Replace JavaMailSender with Resend

**Files:**
- Modify: `apps/backend/pom.xml`

**Step 1: Remove spring-boot-starter-mail, add Resend SDK**

In `pom.xml`, find and remove:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

Add in its place:
```xml
<dependency>
    <groupId>com.resend</groupId>
    <artifactId>resend-java</artifactId>
    <version>3.1.0</version>
</dependency>
```

**Step 2: Verify dependency resolves**

```bash
cd apps/backend && ./mvnw dependency:resolve -q 2>&1 | grep -i "resend\|ERROR" | head -10
```

Expected: No ERROR, resend dependency listed.

**Step 3: Commit**

```bash
git add apps/backend/pom.xml
git commit -m "feat(backend): replace spring-boot-starter-mail with resend-java sdk"
```

---

### Task 6: Backend — Flyway Migration for email_template_overrides

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V32__email_template_overrides.sql`

**Step 1: Create migration**

```sql
CREATE TABLE email_template_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    custom_subject VARCHAR(500),
    custom_body_html TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_template_overrides UNIQUE (template_key, locale)
);
```

**Step 2: Run migration + JOOQ regen**

```bash
cd apps/backend && ./mvnw clean compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

**Step 3: Verify JOOQ generated the new table class**

```bash
grep -r "EMAIL_TEMPLATE_OVERRIDES\|EmailTemplateOverrides" apps/backend/target/generated-sources/ | head -5
```

Expected: Lines showing the generated class.

**Step 4: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V32__email_template_overrides.sql
git commit -m "feat(backend): add email template overrides migration"
```

---

### Task 7: Backend — Resend Config + Updated EmailService

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/email/internal/ResendConfig.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/email/internal/EmailService.java`

**Step 1: Create ResendConfig.java**

```java
package cz.samofujera.email.internal;

import com.resend.Resend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ResendConfig {

    @Bean
    Resend resend(@Value("${app.resend.api-key:re_test_key}") String apiKey) {
        return new Resend(apiKey);
    }
}
```

**Step 2: Replace EmailService.java**

```java
package cz.samofujera.email.internal;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static cz.samofujera.jooq.Tables.EMAIL_TEMPLATE_OVERRIDES;

@Service
class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final Resend resend;
    private final DSLContext dsl;
    private final String fromAddress;

    EmailService(Resend resend,
                 DSLContext dsl,
                 @Value("${app.mail.from:Sámo Fujera <noreply@mail.samofujera.cz>}") String fromAddress) {
        this.resend = resend;
        this.dsl = dsl;
        this.fromAddress = fromAddress;
    }

    /**
     * Send an email using a compiled template.
     *
     * @param to            recipient address
     * @param defaultSubject subject line (used if no DB override exists)
     * @param templateKey   template name without locale/extension (e.g. "welcome")
     * @param locale        "cs" or "sk"
     * @param vars          runtime substitution vars like {"name": "Jan"}
     */
    void send(String to, String defaultSubject, String templateKey, String locale, Map<String, String> vars) {
        var override = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(templateKey))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .fetchOne();

        var subject = (override != null && override.getCustomSubject() != null)
            ? override.getCustomSubject()
            : defaultSubject;

        var html = loadTemplate(templateKey, locale);

        if (override != null && override.getCustomBodyHtml() != null) {
            html = injectBodyOverride(html, override.getCustomBodyHtml());
        }

        for (var entry : vars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }

        var finalHtml = html;
        var finalSubject = subject;

        try {
            var options = CreateEmailOptions.builder()
                .from(fromAddress)
                .to(to)
                .subject(finalSubject)
                .html(finalHtml)
                .build();
            resend.emails().send(options);
        } catch (ResendException e) {
            log.error("Failed to send email via Resend to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    String renderPreview(String templateKey, String locale, Map<String, String> sampleVars) {
        var override = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(templateKey))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .fetchOne();

        var html = loadTemplate(templateKey, locale);

        if (override != null && override.getCustomBodyHtml() != null) {
            html = injectBodyOverride(html, override.getCustomBodyHtml());
        }

        for (var entry : sampleVars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return html;
    }

    private String loadTemplate(String templateKey, String locale) {
        var resourcePath = "/templates/email/" + templateKey + "." + locale + ".html";
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is == null) throw new RuntimeException("Email template not found: " + resourcePath);
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load email template: " + resourcePath, e);
        }
    }

    /**
     * Injects custom body HTML into the template's content section.
     * The compiled React Email template has a <table> section with id "content-section".
     * If not found, appends the override before </body>.
     */
    private String injectBodyOverride(String html, String customBodyHtml) {
        // React Email wraps content in a <td> inside the content section table.
        // We replace content between the brand header table and the footer divider.
        // Simple approach: find the content <td> by a marker comment we'll add in the template.
        // For now: inject before </body> as a safe fallback.
        // TODO: refine injection point after reviewing compiled HTML structure.
        return html.replace("</body>", customBodyHtml + "</body>");
    }
}
```

> **Note:** The `injectBodyOverride` method is a stub — the exact injection strategy depends on the compiled HTML structure. After running the build in Task 4, inspect the compiled HTML to find the right injection point and refine this method. The safe fallback (append before `</body>`) is functional.

**Step 3: Compile**

```bash
cd apps/backend && ./mvnw compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

**Step 4: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/email/internal/ResendConfig.java \
        apps/backend/src/main/java/cz/samofujera/email/internal/EmailService.java
git commit -m "feat(backend): replace javaMailSender with resend sdk in email service"
```

---

### Task 8: Backend — Update EmailListener to Pass Locale

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/email/internal/EmailListener.java`

**Step 1: Update all `emailService.send()` calls**

The new signature is `send(to, defaultSubject, templateKey, locale, vars)`. Use `"cs"` as locale for all events (locale per-user will be added in a future phase when the `users` table locale field is wired to events).

```java
package cz.samofujera.email.internal;

import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserBlockedEvent;
import cz.samofujera.auth.event.UserDeletedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.event.UserUnblockedEvent;
import cz.samofujera.entitlement.event.EntitlementGrantedEvent;
import cz.samofujera.order.event.OrderPaidEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.stream.Collectors;

@Component
class EmailListener {

    private final EmailService emailService;
    private final String frontendUrl;

    EmailListener(EmailService emailService,
                  @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:3000}") String frontendUrl) {
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }

    @ApplicationModuleListener
    void on(UserRegisteredEvent event) {
        emailService.send(event.email(), "Vítejte na Sámo Fujera", "welcome", "cs",
            Map.of("name", event.name()));
    }

    @ApplicationModuleListener
    void on(PasswordResetRequestedEvent event) {
        emailService.send(event.email(), "Obnova hesla", "password-reset", "cs",
            Map.of("name", event.email(),
                   "resetLink", frontendUrl + "/reset-hesla?token=" + event.token()));
    }

    @ApplicationModuleListener
    void on(UserBlockedEvent event) {
        emailService.send(event.email(), "Váš účet byl pozastaven", "account-blocked", "cs",
            Map.of());
    }

    @ApplicationModuleListener
    void on(UserUnblockedEvent event) {
        emailService.send(event.email(), "Váš účet byl obnoven", "account-unblocked", "cs",
            Map.of());
    }

    @ApplicationModuleListener
    void on(UserDeletedEvent event) {
        emailService.send(event.originalEmail(), "Váš účet byl smazán", "account-deleted", "cs",
            Map.of("name", event.name()));
    }

    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        var itemLines = event.items().stream()
            .map(i -> i.quantity() + "× " + i.productTitle())
            .collect(Collectors.joining("<br>"));

        emailService.send(event.userEmail(), "Potvrzení objednávky", "order-confirmation", "cs",
            Map.of(
                "name", event.userName(),
                "orderId", event.orderId().toString(),
                "items", itemLines,
                "totalAmount", event.totalAmount().toPlainString(),
                "currency", event.currency()
            ));
    }

    @ApplicationModuleListener
    void on(EntitlementGrantedEvent event) {
        if ("PRODUCT".equals(event.entityType()) &&
            ("DIGITAL".equals(event.entitySubType()) || "STREAMING".equals(event.entitySubType()))) {
            emailService.send(event.userEmail(), "Váš digitální obsah je připraven", "digital-delivery", "cs",
                Map.of(
                    "name", event.userEmail(),
                    "productTitle", event.entityTitle(),
                    "libraryUrl", frontendUrl + "/muj-ucet/knihovna"
                ));
        }
    }
}
```

**Step 2: Compile**

```bash
cd apps/backend && ./mvnw compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/email/internal/EmailListener.java
git commit -m "feat(backend): update email listener for new send signature with locale"
```

---

### Task 9: Backend — EmailTemplateAdminController

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/email/EmailTemplateAdminController.java`

**Step 1: Create controller**

```java
package cz.samofujera.email;

import cz.samofujera.email.internal.EmailService;
import org.jooq.DSLContext;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static cz.samofujera.jooq.Tables.EMAIL_TEMPLATE_OVERRIDES;

@RestController
@RequestMapping("/api/admin/email-templates")
@PreAuthorize("hasRole('ADMIN')")
class EmailTemplateAdminController {

    record TemplateMeta(String key, String nameCzech, String defaultSubjectCs, String defaultSubjectSk) {}
    record OverrideStatus(boolean cs, boolean sk) {}
    record TemplateListItem(String key, String nameCzech, OverrideStatus overrides, OffsetDateTime updatedAt) {}
    record UpdateOverrideRequest(String locale, String customSubject, String customBodyHtml) {}

    private static final List<TemplateMeta> TEMPLATES = List.of(
        new TemplateMeta("welcome", "Uvítací email", "Vítejte na Sámo Fujera", "Vitajte na Sámo Fujera"),
        new TemplateMeta("password-reset", "Reset hesla", "Obnova hesla", "Obnova hesla"),
        new TemplateMeta("account-blocked", "Zablokování účtu", "Váš účet byl pozastaven", "Váš účet bol pozastavený"),
        new TemplateMeta("account-unblocked", "Odblokování účtu", "Váš účet byl obnoven", "Váš účet bol obnovený"),
        new TemplateMeta("account-deleted", "Smazání účtu", "Váš účet byl smazán", "Váš účet bol vymazaný"),
        new TemplateMeta("order-confirmation", "Potvrzení objednávky", "Potvrzení objednávky", "Potvrdenie objednávky"),
        new TemplateMeta("digital-delivery", "Doručení digitálního obsahu", "Váš digitální obsah je připraven", "Váš digitálny obsah je pripravený")
    );

    private static final Map<String, Map<String, String>> SAMPLE_VARS = Map.of(
        "welcome", Map.of("name", "Jan Novák"),
        "password-reset", Map.of("name", "Jan Novák", "resetLink", "https://www.samofujera.cz/reset-hesla?token=sample"),
        "account-blocked", Map.of(),
        "account-unblocked", Map.of(),
        "account-deleted", Map.of("name", "Jan Novák"),
        "order-confirmation", Map.of("name", "Jan Novák", "orderId", "ORD-001", "items", "1× Meditace pro začátečníky<br>2× Jóga doma", "totalAmount", "990.00", "currency", "CZK"),
        "digital-delivery", Map.of("name", "Jan Novák", "productTitle", "Meditace pro začátečníky", "libraryUrl", "https://www.samofujera.cz/muj-ucet/knihovna")
    );

    private final DSLContext dsl;
    private final EmailService emailService;

    EmailTemplateAdminController(DSLContext dsl, EmailService emailService) {
        this.dsl = dsl;
        this.emailService = emailService;
    }

    @GetMapping
    List<TemplateListItem> listTemplates() {
        var overrides = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES).fetch();

        return TEMPLATES.stream().map(meta -> {
            var csOverride = overrides.stream()
                .anyMatch(r -> meta.key().equals(r.getTemplateKey()) && "cs".equals(r.getLocale()));
            var skOverride = overrides.stream()
                .anyMatch(r -> meta.key().equals(r.getTemplateKey()) && "sk".equals(r.getLocale()));
            var latestUpdated = overrides.stream()
                .filter(r -> meta.key().equals(r.getTemplateKey()))
                .map(r -> r.getUpdatedAt())
                .max(OffsetDateTime::compareTo)
                .orElse(null);

            return new TemplateListItem(meta.key(), meta.nameCzech(), new OverrideStatus(csOverride, skOverride), latestUpdated);
        }).toList();
    }

    @GetMapping(value = "/{key}/preview", produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> previewTemplate(@PathVariable String key, @RequestParam(defaultValue = "cs") String locale) {
        var sampleVars = SAMPLE_VARS.getOrDefault(key, Map.of());
        var html = emailService.renderPreview(key, locale, sampleVars);
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(html);
    }

    @PutMapping("/{key}")
    ResponseEntity<Void> updateOverride(@PathVariable String key, @RequestBody UpdateOverrideRequest request) {
        dsl.insertInto(EMAIL_TEMPLATE_OVERRIDES)
            .set(EMAIL_TEMPLATE_OVERRIDES.ID, UUID.randomUUID())
            .set(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY, key)
            .set(EMAIL_TEMPLATE_OVERRIDES.LOCALE, request.locale())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_SUBJECT, request.customSubject())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_BODY_HTML, request.customBodyHtml())
            .set(EMAIL_TEMPLATE_OVERRIDES.UPDATED_AT, OffsetDateTime.now())
            .onConflict(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY, EMAIL_TEMPLATE_OVERRIDES.LOCALE)
            .doUpdate()
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_SUBJECT, request.customSubject())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_BODY_HTML, request.customBodyHtml())
            .set(EMAIL_TEMPLATE_OVERRIDES.UPDATED_AT, OffsetDateTime.now())
            .execute();
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{key}")
    ResponseEntity<Void> deleteOverride(@PathVariable String key, @RequestParam String locale) {
        dsl.deleteFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(key))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .execute();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{key}/default-subject")
    ResponseEntity<Map<String, String>> getDefaultSubjects(@PathVariable String key) {
        return TEMPLATES.stream()
            .filter(m -> m.key().equals(key))
            .findFirst()
            .map(m -> ResponseEntity.ok(Map.of("cs", m.defaultSubjectCs(), "sk", m.defaultSubjectSk())))
            .orElse(ResponseEntity.notFound().build());
    }
}
```

**Step 2: Compile**

```bash
cd apps/backend && ./mvnw compile -DskipTests 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/email/EmailTemplateAdminController.java
git commit -m "feat(backend): add email template admin controller (list, preview, update, delete)"
```

---

### Task 10: Backend — Update EmailListenerIntegrationTest

The old test mocked `JavaMailSender`. Replace with Resend mock.

**Files:**
- Modify: `apps/backend/src/test/java/cz/samofujera/email/EmailListenerIntegrationTest.java`

**Step 1: Replace test**

```java
package cz.samofujera.email;

import com.resend.Resend;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserBlockedEvent;
import cz.samofujera.auth.event.UserDeletedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.event.UserUnblockedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@Import(TestcontainersConfig.class)
class EmailListenerIntegrationTest {

    @MockitoBean
    private Resend resend;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @BeforeEach
    void setUp() throws Exception {
        var emails = mock(Emails.class);
        when(resend.emails()).thenReturn(emails);
        when(emails.send(any(CreateEmailOptions.class)))
            .thenReturn(new CreateEmailResponse());
    }

    @Test
    void userRegisteredEvent_sendsWelcomeEmail() throws InterruptedException {
        publishInTransaction(new UserRegisteredEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(resend.emails(), atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void passwordResetRequestedEvent_sendsResetEmail() throws InterruptedException {
        publishInTransaction(new PasswordResetRequestedEvent(UUID.randomUUID(), "test@example.com", "abc123"));
        Thread.sleep(2000);
        verify(resend.emails(), atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userBlockedEvent_sendsBlockedEmail() throws InterruptedException {
        publishInTransaction(new UserBlockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(resend.emails(), atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userUnblockedEvent_sendsUnblockedEmail() throws InterruptedException {
        publishInTransaction(new UserUnblockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(resend.emails(), atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userDeletedEvent_sendsDeletedEmail() throws InterruptedException {
        publishInTransaction(new UserDeletedEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(resend.emails(), atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    private void publishInTransaction(Object event) {
        transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(event));
    }
}
```

**Step 2: Run tests**

```bash
cd apps/backend && ./mvnw test -Dtest=EmailListenerIntegrationTest 2>&1 | tail -15
```

Expected: All 5 tests pass.

**Step 3: Run all backend tests**

```bash
cd apps/backend && ./mvnw test 2>&1 | tail -10
```

Expected: `BUILD SUCCESS`, all tests green.

**Step 4: Commit**

```bash
git add apps/backend/src/test/java/cz/samofujera/email/EmailListenerIntegrationTest.java
git commit -m "test(backend): update email listener test to mock resend instead of javaMailSender"
```

---

### Task 11: API Client — Email Admin Types and Endpoints

**Files:**
- Modify: `packages/api-client/src/admin.ts`
- Modify: `packages/api-client/src/index.ts` (if email types need exporting)

**Step 1: Add types and functions to admin.ts**

Add these types near the top of `admin.ts` (after existing imports):

```typescript
export interface EmailTemplateOverrideStatus {
  cs: boolean;
  sk: boolean;
}

export interface EmailTemplateListItem {
  key: string;
  nameCzech: string;
  overrides: EmailTemplateOverrideStatus;
  updatedAt: string | null;
}

export interface UpdateEmailTemplateOverrideRequest {
  locale: string;
  customSubject: string | null;
  customBodyHtml: string | null;
}
```

Add these functions to the `adminApi` object:

```typescript
  // Email Templates
  getEmailTemplates: () =>
    apiFetch<EmailTemplateListItem[]>("/api/admin/email-templates"),

  getEmailTemplateDefaultSubjects: (key: string) =>
    apiFetch<{ cs: string; sk: string }>(`/api/admin/email-templates/${key}/default-subject`),

  updateEmailTemplateOverride: (key: string, data: UpdateEmailTemplateOverrideRequest) =>
    apiFetch<void>(`/api/admin/email-templates/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteEmailTemplateOverride: (key: string, locale: string) =>
    apiFetch<void>(`/api/admin/email-templates/${key}?locale=${locale}`, {
      method: "DELETE",
    }),
```

**Step 2: Export new types from index.ts**

In `packages/api-client/src/index.ts`, add to the exports:

```typescript
export type { EmailTemplateListItem, EmailTemplateOverrideStatus, UpdateEmailTemplateOverrideRequest } from "./admin";
```

**Step 3: Verify types compile**

```bash
cd packages/api-client && pnpm tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add packages/api-client/src/admin.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): add email template admin api types and endpoints"
```

---

### Task 12: Frontend — Admin Emaily Route and Navigation

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/emaily/page.tsx`
- Modify: `apps/web/src/components/admin/layout/AdminSidebar.tsx` (or wherever nav links are)

**Step 1: Create page file**

```tsx
import { EmailTemplatesPage } from "@/components/admin/routes/email-templates";
export default EmailTemplatesPage;
```

**Step 2: Add nav link to sidebar**

Find the admin sidebar/navigation file. Search for an existing nav item like `stranky` or `produkty` to find the pattern:

```bash
grep -r "stranky\|Stránky\|stranky" apps/web/src/components/admin/ --include="*.tsx" -l | head -5
```

Add a new nav item for `emaily`:

```tsx
{ href: "/admin/emaily", label: t`Emaily`, icon: Mail }
```

Import `Mail` from `lucide-react` if not already imported.

**Step 3: Compile**

```bash
pnpm turbo typecheck --filter=web 2>&1 | tail -10
```

Expected: No new errors (route component doesn't exist yet so there may be an import error — that's OK, fixed in Task 13).

**Step 4: Commit (after Task 13)**

Hold this commit until after Task 13.

---

### Task 13: Frontend — EmailTemplatesPage Component

**Files:**
- Create: `apps/web/src/components/admin/routes/email-templates.tsx`
- Create: `apps/web/src/components/admin/emails/edit-email-template-dialog.tsx`

**Step 1: Create edit dialog component**

```tsx
"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@samofujera/api-client";
import type { EmailTemplateListItem } from "@samofujera/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@samofujera/ui/components/dialog";
import { Button } from "@samofujera/ui/components/button";
import { Input } from "@samofujera/ui/components/input";
import { Label } from "@samofujera/ui/components/label";
import { Textarea } from "@samofujera/ui/components/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@samofujera/ui/components/tabs";
import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

interface Props {
  template: EmailTemplateListItem | null;
  open: boolean;
  onClose: () => void;
}

export function EditEmailTemplateDialog({ template, open, onClose }: Props) {
  const { i18n } = useLingui();
  const queryClient = useQueryClient();
  const [activeLocale, setActiveLocale] = useState<"cs" | "sk">("cs");
  const [subjectCs, setSubjectCs] = useState("");
  const [subjectSk, setSubjectSk] = useState("");
  const [bodyCs, setBodyCs] = useState("");
  const [bodySk, setBodySk] = useState("");

  const defaultSubjectsQuery = useQuery({
    queryKey: ["email-template-default-subjects", template?.key],
    queryFn: () => adminApi.getEmailTemplateDefaultSubjects(template!.key),
    enabled: !!template,
  });

  useEffect(() => {
    if (!template) return;
    setSubjectCs("");
    setSubjectSk("");
    setBodyCs("");
    setBodySk("");
  }, [template?.key]);

  const saveMutation = useMutation({
    mutationFn: (locale: "cs" | "sk") =>
      adminApi.updateEmailTemplateOverride(template!.key, {
        locale,
        customSubject: locale === "cs" ? subjectCs || null : subjectSk || null,
        customBodyHtml: locale === "cs" ? bodyCs || null : bodySk || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (locale: "cs" | "sk") =>
      adminApi.deleteEmailTemplateOverride(template!.key, locale),
    onSuccess: () => {
      if (activeLocale === "cs") { setSubjectCs(""); setBodyCs(""); }
      else { setSubjectSk(""); setBodySk(""); }
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });

  const previewUrl = template
    ? `/api/admin/email-templates/${template.key}/preview?locale=${activeLocale}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.nameCzech}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as "cs" | "sk")}>
          <TabsList>
            <TabsTrigger value="cs">Čeština</TabsTrigger>
            <TabsTrigger value="sk">Slovenčina</TabsTrigger>
          </TabsList>

          {(["cs", "sk"] as const).map((locale) => (
            <TabsContent key={locale} value={locale} className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>{t(i18n)`Předmět`}</Label>
                <Input
                  value={locale === "cs" ? subjectCs : subjectSk}
                  onChange={(e) =>
                    locale === "cs" ? setSubjectCs(e.target.value) : setSubjectSk(e.target.value)
                  }
                  placeholder={
                    defaultSubjectsQuery.data?.[locale] ?? t(i18n)`Výchozí předmět šablony`
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>{t(i18n)`Tělo emailu (HTML override)`}</Label>
                <Textarea
                  value={locale === "cs" ? bodyCs : bodySk}
                  onChange={(e) =>
                    locale === "cs" ? setBodyCs(e.target.value) : setBodySk(e.target.value)
                  }
                  placeholder={t(i18n)`Nechte prázdné pro výchozí obsah šablony`}
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {previewUrl && (
          <div className="border rounded-lg overflow-hidden mt-2">
            <p className="text-xs text-muted-foreground px-3 py-2 border-b bg-muted">
              {t(i18n)`Náhled`} ({activeLocale.toUpperCase()})
            </p>
            <iframe
              key={`${template?.key}-${activeLocale}`}
              src={previewUrl}
              className="w-full h-[400px]"
              title="Email preview"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate(activeLocale)}
            disabled={resetMutation.isPending}
          >
            {t(i18n)`Obnovit výchozí`}
          </Button>
          <Button
            onClick={() => saveMutation.mutate(activeLocale)}
            disabled={saveMutation.isPending}
          >
            {t(i18n)`Uložit`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create email-templates route component**

```tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@samofujera/api-client";
import type { EmailTemplateListItem } from "@samofujera/api-client";
import { Button } from "@samofujera/ui/components/button";
import { Badge } from "@samofujera/ui/components/badge";
import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { EditEmailTemplateDialog } from "../emails/edit-email-template-dialog";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export function EmailTemplatesPage() {
  const { i18n } = useLingui();
  const [selected, setSelected] = useState<EmailTemplateListItem | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: adminApi.getEmailTemplates,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(i18n)`Emailové šablony`}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(i18n)`Přizpůsobte předmět a obsah automatických emailů`}
        </p>
      </div>

      <div className="border rounded-lg divide-y">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">{t(i18n)`Načítání…`}</div>
        )}
        {templates?.map((template) => (
          <div key={template.key} className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="font-medium text-sm">{template.nameCzech}</p>
              <p className="text-xs text-muted-foreground font-mono">{template.key}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant={template.overrides.cs ? "default" : "outline"} className="text-xs">
                  CS {template.overrides.cs ? "✓" : "—"}
                </Badge>
                <Badge variant={template.overrides.sk ? "default" : "outline"} className="text-xs">
                  SK {template.overrides.sk ? "✓" : "—"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {template.updatedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(template.updatedAt), "d. M. yyyy", { locale: cs })}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelected(template)}>
                {t(i18n)`Upravit`}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <EditEmailTemplateDialog
        template={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
```

**Step 3: Typecheck and lint**

```bash
pnpm turbo typecheck --filter=web 2>&1 | tail -10
pnpm turbo lint --filter=web 2>&1 | tail -10
```

Fix any errors before committing.

**Step 4: Commit everything**

```bash
git add apps/web/src/app/\(dashboard\)/admin/emaily/ \
        apps/web/src/components/admin/routes/email-templates.tsx \
        apps/web/src/components/admin/emails/ \
        apps/web/src/components/admin/
git commit -m "feat(admin): add email templates management page with edit dialog and preview"
```

---

### Task 14: Final Verification

**Step 1: Run all backend tests**

```bash
cd apps/backend && ./mvnw test 2>&1 | tail -15
```

Expected: All tests green.

**Step 2: Run frontend checks**

```bash
pnpm turbo lint && pnpm turbo typecheck
```

Expected: Clean.

**Step 3: Build email templates**

```bash
cd packages/emails && pnpm build
```

Expected: 14 `.html` files built.

**Step 4: Manual smoke test**

1. Start backend: `cd apps/backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
2. Start frontend: `pnpm dev` from `apps/web`
3. Navigate to `http://localhost:3000/admin/emaily`
4. Verify all 7 templates listed with CS/SK override badges
5. Click "Upravit" on Welcome template
6. Verify iframe preview loads
7. Enter custom subject, click Uložit
8. Verify CS badge turns active
9. Click "Obnovit výchozí" → badge returns to outline
10. Check Mailpit at `http://localhost:8025` by triggering a test event (register a new user via `/registrace`)

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix(emails): address verification issues"
```
