# Email System Redesign — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** Upgrade the email system from JavaMailSender SMTP + `{{placeholder}}` HTML templates to typed React Email components (cs/sk), Resend API delivery, DB-backed subject/body overrides, and an admin UI for on-the-fly editing.

**Approach:** Build-time HTML generation (React Email → HTML per locale), Spring calls Resend HTTP API, DB overrides for subject + body text, admin `/admin/emaily` for editing.

---

## Section 1: `packages/emails` — Templates

### Typed Props

Replace `{{placeholder}}` string substitution with typed React props per template:

```tsx
export type WelcomeProps = { name: string; locale: 'cs' | 'sk' }
export const Welcome = ({ name, locale }: WelcomeProps) => ...
```

### i18n: cs + sk

Each template renders in two locales via a translations map (no Lingui — too heavy for email build):

```ts
const t = {
  cs: { greeting: 'Vítejte', ... },
  sk: { greeting: 'Vitajte', ... }
}
```

Build outputs one HTML file per template per locale: `welcome.cs.html`, `welcome.sk.html`, etc.

### Brand Design

Layout component updated with:
- Brand colors: `#8B7355` (earth), `#F8F5F0` (cream), `#3D3530` (text), `#8FA387` (sage)
- Inter font (via Google Fonts link in `<head>`)
- Samo Fujera logo in header
- All inline styles (required by React Email)

### Build Step

`build.ts` loops over each template × each locale, renders to HTML, writes to `apps/backend/src/main/resources/templates/email/`. Turborepo dependency ensures email build runs before backend compile.

### Templates (7 total)

| Key | Component | Props |
|-----|-----------|-------|
| `welcome` | `Welcome` | `name` |
| `password-reset` | `PasswordReset` | `name`, `resetUrl` |
| `account-blocked` | `AccountBlocked` | `name` |
| `account-unblocked` | `AccountUnblocked` | `name` |
| `account-deleted` | `AccountDeleted` | `name` |
| `order-confirmation` | `OrderConfirmation` | `name`, `orderId`, `items`, `totalAmount`, `currency` |
| `digital-delivery` | `DigitalDelivery` | `name`, `productName`, `downloadUrl` |

---

## Section 2: Backend — Resend Integration

### Dependency Change

Remove `spring-boot-starter-mail`. Add Resend Java SDK (`com.resend:resend-java`).

### EmailService

`EmailService.send(String to, String templateKey, String locale, Map<String, Object> vars)` flow:
1. Load `{templateKey}.{locale}.html` from classpath
2. Substitute typed vars (simple `{{key}}` for runtime values like name, orderId — these are data props, not style/layout)
3. Check `email_template_overrides` for `(templateKey, locale)` override
4. If override exists: use `override.custom_subject` and inject `override.custom_body_html` into body slot
5. Call Resend API with resolved subject + HTML

### New DB Table (Flyway migration)

```sql
CREATE TABLE email_template_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    custom_subject VARCHAR(500),
    custom_body_html TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (template_key, locale)
);
```

### Config

```yaml
app:
  resend:
    api-key: ${RESEND_API_KEY}
  mail:
    from: "Sámo Fujera <noreply@mail.samofujera.cz>"
```

`RESEND_API_KEY` already set as Fly.io secret.

---

## Section 3: Admin UI — `/admin/emaily`

### Template List Page

Route: `/admin/emaily`

Table with columns:
- Template name (human-readable Czech)
- Locale chips (cs / sk) with indicator if override exists
- Last edited date (from `updated_at`)
- Edit button

### Edit Dialog

Opened per template. Contains:
- **Locale tabs** — cs / sk switcher
- **Předmět** — text input, placeholder = compiled default subject
- **Tělo emailu** — `<Textarea>` for body HTML override, placeholder = compiled default body
- **Náhled** — `<iframe>` sourced from `GET /api/admin/email-templates/{key}/preview?locale=cs`
- **Uložit** / **Obnovit výchozí** buttons

### Backend API Endpoints

```
GET  /api/admin/email-templates
     → list: [{ key, nameCzech, overrides: { cs: bool, sk: bool }, updatedAt }]

GET  /api/admin/email-templates/{key}/preview?locale=cs
     → rendered HTML string (with current overrides applied, sample data for vars)

PUT  /api/admin/email-templates/{key}
     body: { locale, customSubject, customBodyHtml }
     → upsert override row

DELETE /api/admin/email-templates/{key}?locale=cs
     → delete override row (reset to compiled default)
```

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Build-time HTML (not runtime rendering) | Emails work even if Next.js is slow/down; clean separation |
| Translations map instead of Lingui | Email build has no i18n runtime — simple key-value map is sufficient |
| Textarea for body override (not rich text) | Email HTML is technical; rich text editor would corrupt inline styles |
| Resend Java SDK in Spring | Email sending is a side effect of Spring domain events — keep it in Spring |
| `{{key}}` still used for runtime data | Typed props set at build time; runtime values (name, orderId) still substituted at send time |
| Preview endpoint with sample data | Admin needs to see realistic preview without real order/user data |
