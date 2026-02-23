import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountUnblocked = () => (
  <Layout preview="Váš účet byl obnoven - Sámo Fujera">
    <Heading as="h2" style={heading}>
      Účet byl obnoven
    </Heading>
    <Text style={paragraph}>
      S radostí vám oznamujeme, že váš účet na platformě Sámo Fujera byl
      obnoven. Nyní se můžete opět přihlásit a využívat všechny služby.
    </Text>
    <Text style={paragraph}>
      Děkujeme za vaši trpělivost. Pokud máte jakékoli dotazy, neváhejte se na
      nás obrátit.
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
