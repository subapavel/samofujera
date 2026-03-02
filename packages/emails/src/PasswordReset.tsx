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
