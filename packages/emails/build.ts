import { render } from "@react-email/components";
import { writeFileSync, mkdirSync } from "fs";
import React from "react";
import { Welcome } from "./src/Welcome";
import { PasswordReset } from "./src/PasswordReset";
import { AccountBlocked } from "./src/AccountBlocked";
import { AccountUnblocked } from "./src/AccountUnblocked";
import { AccountDeleted } from "./src/AccountDeleted";

const OUTPUT_DIR = "../../apps/backend/src/main/resources/templates/email";

mkdirSync(OUTPUT_DIR, { recursive: true });

const templates = [
  { name: "welcome", component: Welcome },
  { name: "password-reset", component: PasswordReset },
  { name: "account-blocked", component: AccountBlocked },
  { name: "account-unblocked", component: AccountUnblocked },
  { name: "account-deleted", component: AccountDeleted },
];

async function build() {
  for (const { name, component: Component } of templates) {
    const html = await render(React.createElement(Component));
    writeFileSync(`${OUTPUT_DIR}/${name}.html`, html);
    console.log(`built ${name}.html`);
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
