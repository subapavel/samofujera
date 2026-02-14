import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const AccountBlocked = () => (
  <Layout preview="Vas ucet byl zablokovany - Samo Fujera">
    <Heading as="h2" style={heading}>
      Ucet byl zablokovany
    </Heading>
    <Text style={paragraph}>
      Vas ucet na platforme Samo Fujera byl zablokovany. Pristup k vasemu uctu a
      vsem souvisejicim sluzbam byl docasne pozastaven.
    </Text>
    <Text style={paragraph}>
      Pokud se domnivate, ze doslo k omylu, kontaktujte nas prosim na adrese
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
