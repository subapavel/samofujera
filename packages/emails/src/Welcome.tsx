import { Heading, Text } from "@react-email/components";
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
