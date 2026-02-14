import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountUnblocked = () => (
  <Layout preview="Vas ucet byl obnoven - Samo Fujera">
    <Heading as="h2" style={heading}>
      Ucet byl obnoven
    </Heading>
    <Text style={paragraph}>
      S radosti vam oznamujeme, ze vas ucet na platforme Samo Fujera byl
      obnoven. Nyni se muzete opet prihlasit a vyuzivat vsechny sluzby.
    </Text>
    <Text style={paragraph}>
      Dekujeme za vasi trpelivost. Pokud mate jakekoli dotazy, neváhejte se na
      nas obratit.
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

export default AccountUnblocked;
