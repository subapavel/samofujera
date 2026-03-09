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
import type { Locale } from "./src/translations";

const OUTPUT_DIR = "../../apps/backend-quarkus/src/main/resources/templates/email";

mkdirSync(OUTPUT_DIR, { recursive: true });

type LocaleProps = { locale?: Locale };
type EmailComponent = React.ComponentType<LocaleProps>;

const templates: Array<{ name: string; component: EmailComponent }> = [
  { name: "welcome", component: Welcome },
  { name: "password-reset", component: PasswordReset },
  { name: "account-blocked", component: AccountBlocked },
  { name: "account-unblocked", component: AccountUnblocked },
  { name: "account-deleted", component: AccountDeleted },
  { name: "order-confirmation", component: OrderConfirmation },
  { name: "digital-delivery", component: DigitalDelivery },
];

const locales: Locale[] = ["cs", "sk"];

async function build() {
  for (const { name, component: Component } of templates) {
    for (const locale of locales) {
      const html = await render(React.createElement(Component, { locale }));
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
