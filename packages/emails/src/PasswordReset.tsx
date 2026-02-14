import { Heading, Text, Button, Section } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const PasswordReset = () => (
  <Layout preview="Obnoveni hesla - Samo Fujera">
    <Heading as="h2" style={heading}>
      Obnoveni hesla
    </Heading>
    <Text style={paragraph}>
      Obdrzeli jsme zadost o obnoveni vaseho hesla. Kliknete na tlacitko nize
      pro nastaveni noveho hesla.
    </Text>
    <Section style={buttonContainer}>
      <Button href="{{resetLink}}" style={button}>
        Obnovit heslo
      </Button>
    </Section>
    <Text style={warning}>
      Tento odkaz je platny pouze 1 hodinu. Pokud jste o obnoveni hesla
      nezadali, tento e-mail muzete ignorovat.
    </Text>
  </Layout>
);

const heading: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#18181b",
  fontSize: "22px",
};

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "1.6",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#18181b",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
  display: "inline-block",
};

const warning: React.CSSProperties = {
  margin: "16px 0 0",
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "1.5",
  fontStyle: "italic",
};

export default PasswordReset;
