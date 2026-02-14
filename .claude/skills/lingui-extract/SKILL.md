---
name: lingui-extract
description: "Extract i18n strings from source code and update .po message catalogs for Czech and Slovak. Manages Lingui translations."
disable-model-invocation: true
---

# Extract and Manage i18n Strings

## MANDATORY: Check Context7 First
Use Context7 to verify the current Lingui CLI commands, .po file format,
and ICU MessageFormat syntax.

## Steps

1. **Extract messages from source code:**
   ```bash
   pnpm lingui extract
   ```
   This scans all source files for `t()`, `<Trans>`, and `msg()` calls
   and updates the `.po` catalog files.

2. **Review new/changed strings in:**
   - `packages/i18n/src/locales/cs.po` (Czech)
   - `packages/i18n/src/locales/sk.po` (Slovak)

3. **Translate new strings:**
   - Fill in translations for both locales
   - Pay attention to plural forms

4. **Compile catalogs:**
   ```bash
   pnpm lingui compile
   ```

5. **Verify no missing translations:**
   Check that there are no untranslated entries.

## Czech Plural Forms
Czech has 4 forms: one, few, many, other
```
{count, plural,
  one {# položka}
  few {# položky}
  many {# položky}
  other {# položek}
}
```

## Slovak Plural Forms
Slovak has 3 forms: one, few, other
```
{count, plural,
  one {# položka}
  few {# položky}
  other {# položiek}
}
```

## Marking Strings for Translation
```tsx
// Simple string
import { t } from "@lingui/core/macro";
const label = t`Add to cart`;

// With JSX
import { Trans } from "@lingui/react/macro";
<Trans>Add to cart</Trans>

// With plurals
import { Plural } from "@lingui/react/macro";
<Plural value={count} one="# item" few="# items" other="# items" />
```

## Rules
- EVERY user-facing string must go through Lingui
- Run extract after adding/changing any translated strings
- Always provide both cs and sk translations
- Use ICU MessageFormat for plurals, numbers, dates
- Never hardcode user-facing text in components
