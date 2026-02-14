import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const Welcome = () => (
  <Layout preview="Vitejte na platforme Samo Fujera">
    <Heading as="h2" style={heading}>
      {"Vitejte, {{name}}!"}
    </Heading>
    <Text style={paragraph}>
      Dekujeme za registraci na platforme Samo Fujera. Jsme radi, ze jste se k
      nam pridali.
    </Text>
    <Text style={paragraph}>
      Vase cesta k osobnimu rustu, zdravi a duchovnimu rozvoji prave zacina.
      Prozkoumejte nase kurzy, clanky a komunitu.
    </Text>
    <Text style={paragraph}>
      Pokud mate jakekoli dotazy, nevahejte se na nas obratit.
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
