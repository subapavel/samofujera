import { Heading, Text, Button, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type DigitalDeliveryProps = { locale?: Locale };

export const DigitalDelivery = ({ locale = "cs" }: DigitalDeliveryProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Váš digitální obsah je připraven" : "Váš digitálny obsah je pripravený"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Váš obsah je připraven, {{name}}!" : "Váš obsah je pripravený, {{name}}!"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Produkt {{productTitle}} je nyní dostupný ve vaší knihovně."
          : "Produkt {{productTitle}} je teraz dostupný vo vašej knižnici."}
      </Text>
      <Section style={buttonSection}>
        <Button href="{{libraryUrl}}" style={button}>
          {locale === "cs" ? "Přejít do knihovny" : "Prejsť do knižnice"}
        </Button>
      </Section>
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
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default DigitalDelivery;
