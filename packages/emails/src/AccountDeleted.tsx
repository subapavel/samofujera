import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountDeleted = () => (
  <Layout preview="Váš účet byl smazán - Sámo Fujera">
    <Heading as="h2" style={heading}>
      Účet byl smazán
    </Heading>
    <Text style={paragraph}>
      {"Vážený/á {{name}}, váš účet na platformě Sámo Fujera byl úspěšně smazán."}
    </Text>
    <Text style={paragraph}>
      Všechna vaše osobní data byla odstraněna v souladu s našimi zásadami
      ochrany osobních údajů.
    </Text>
    <Text style={paragraph}>
      Pokud byste se v budoucnu rozhodli vrátit, budeme vás rádi opět vítat.
      Děkujeme, že jste byli součástí naší komunity.
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
