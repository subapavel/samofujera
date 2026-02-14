import { Heading, Text, Hr } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const OrderConfirmation = () => (
  <Layout preview="Potvrzení objednávky">
    <Heading as="h2" style={heading}>
      {"Děkujeme za objednávku, {{name}}!"}
    </Heading>
    <Text style={paragraph}>
      {"Vaše objednávka č. {{orderId}} byla úspěšně zaplacena."}
    </Text>
    <Hr style={divider} />
    <Text style={label}>Položky:</Text>
    <Text style={paragraph}>{"{{items}}"}</Text>
    <Hr style={divider} />
    <Text style={total}>{"Celkem: {{totalAmount}} {{currency}}"}</Text>
  </Layout>
);

const heading: React.CSSProperties = {
  margin: "0 0 16px",
  color: "#18181b",
  fontSize: "22px",
};

const paragraph: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#3f3f46",
  fontSize: "14px",
  lineHeight: "24px",
};

const label: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#71717a",
  fontSize: "12px",
  textTransform: "uppercase" as const,
};

const total: React.CSSProperties = {
  margin: "0",
  color: "#18181b",
  fontSize: "18px",
  fontWeight: "bold",
};

const divider: React.CSSProperties = {
  margin: "16px 0",
  borderColor: "#e4e4e7",
};

export default OrderConfirmation;
