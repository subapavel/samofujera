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
