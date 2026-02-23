import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  sourceLocale: "cs",
  locales: ["cs", "sk"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: [
        "<rootDir>/../../apps/web/src/**/*.tsx",
        "<rootDir>/../../apps/web/src/**/*.ts",
      ],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
