import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const Welcome = () => (
  <Layout preview="Vítejte na platformě Sámo Fujera">
    <Heading as="h2" style={heading}>
      {"Vítejte, {{name}}!"}
    </Heading>
    <Text style={paragraph}>
      Děkujeme za registraci na platformě Sámo Fujera. Jsme rádi, že jste se k
      nám přidali.
    </Text>
    <Text style={paragraph}>
      Vaše cesta k osobnímu růstu, zdraví a duchovnímu rozvoji právě začíná.
      Prozkoumejte naše kurzy, články a komunitu.
    </Text>
    <Text style={paragraph}>
      Pokud máte jakékoli dotazy, neváhejte se na nás obrátit.
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

export default Welcome;
