---
name: email-template
description: "Create a React Email template with branded layout, i18n support, and locale-aware formatting."
argument-hint: "[template-name]"
disable-model-invocation: true
---

# Create React Email Template

## MANDATORY: Check Context7 First
Use Context7 to verify the current React Email API — components, styling
approach, and rendering patterns.

## Steps

1. Create template file: `packages/emails/src/templates/$ARGUMENTS.tsx`
2. Use the shared `EmailLayout` component for branded header/footer
3. Accept `locale` prop for i18n
4. Use locale-aware formatting for dates and prices
5. Add to barrel export in `packages/emails/src/index.ts`
6. Preview the email using React Email dev server

## Template
```tsx
import { EmailLayout } from "../components/EmailLayout";
import { Text, Button, Section } from "@react-email/components";

interface $ARGUMENTSProps {
  locale: "cs" | "sk";
  userName: string;
  // Add template-specific props
}

export function $ARGUMENTS({ locale, userName }: $ARGUMENTSProps) {
  const translations = {
    cs: {
      greeting: `Dobrý den, ${userName}`,
      // ...
    },
    sk: {
      greeting: `Dobrý deň, ${userName}`,
      // ...
    },
  };
  const t = translations[locale];

  return (
    <EmailLayout locale={locale}>
      <Section>
        <Text>{t.greeting}</Text>
        {/* Template content */}
      </Section>
    </EmailLayout>
  );
}

export default $ARGUMENTS;
```

## Email Layout
All emails use `EmailLayout` which provides:
- Brand logo header
- Consistent typography (warm tones)
- Footer with links and legal text
- Locale-aware content direction

## Rules
- Every email must support both `cs` and `sk` locales
- Use inline styles (React Email requirement for email clients)
- Keep emails simple — not all CSS works in email clients
- Format prices with `Intl.NumberFormat` (locale-aware)
- Format dates with `Intl.DateTimeFormat` (locale-aware)
- Always preview before committing
