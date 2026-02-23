import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountBlocked = () => (
  <Layout preview="Váš účet byl zablokován - Sámo Fujera">
    <Heading as="h2" style={heading}>
      Účet byl zablokován
    </Heading>
    <Text style={paragraph}>
      Váš účet na platformě Sámo Fujera byl zablokován. Přístup k vašemu účtu a
      všem souvisejícím službám byl dočasně pozastaven.
    </Text>
    <Text style={paragraph}>
      Pokud se domníváte, že došlo k omylu, kontaktujte nás prosím na adrese
      podpora@samofujera.cz.
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

export default AccountBlocked;
