import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountDeleted = () => (
  <Layout preview="Vas ucet byl smazan - Samo Fujera">
    <Heading as="h2" style={heading}>
      Ucet byl smazan
    </Heading>
    <Text style={paragraph}>
      {"Vazeny/a {{name}}, vas ucet na platforme Samo Fujera byl uspesne smazan."}
    </Text>
    <Text style={paragraph}>
      Vsechna vase osobni data byla odstranena v souladu s nasimi zasadami
      ochrany osobnich udaju.
    </Text>
    <Text style={paragraph}>
      Pokud byste se v budoucnu rozhodli vratit, budeme vas radi opet vitat.
      Dekujeme, ze jste byli soucasti nasi komunity.
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

export default AccountDeleted;
