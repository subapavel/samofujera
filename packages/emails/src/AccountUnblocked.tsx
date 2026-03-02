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
          ? "Váš účet na stránce Sámo Fujera byl úspěšně obnoven. Nyní se můžete znovu přihlásit."
          : "Váš účet na stránke Sámo Fujera bol úspešne obnovený. Teraz sa môžete znovu prihlásiť."}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "15px", lineHeight: "1.6" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default AccountUnblocked;
