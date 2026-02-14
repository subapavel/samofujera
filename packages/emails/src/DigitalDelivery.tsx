import { Heading, Text, Button } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const DigitalDelivery = () => (
  <Layout preview="Váš digitální obsah je připraven">
    <Heading as="h2" style={heading}>
      {"Váš produkt je připraven ke stažení!"}
    </Heading>
    <Text style={paragraph}>
      {"Produkt \"{{productTitle}}\" je nyní k dispozici ve vaší knihovně."}
    </Text>
    <Button href="{{libraryUrl}}" style={button}>
      Přejít do knihovny
    </Button>
  </Layout>
);

const heading: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#18181b",
  fontSize: "22px",
};

const paragraph: React.CSSProperties = {
  margin: "0 0 24px",
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "24px",
};

const button: React.CSSProperties = {
  backgroundColor: "#18181b",
  color: "#fafafa",
  padding: "12px 24px",
  borderRadius: "6px",
  fontSize: "14px",
  textDecoration: "none",
};

export default DigitalDelivery;
