import { Heading, Text, Hr } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";
import { t, type Locale } from "./translations";

export type OrderConfirmationProps = { locale?: Locale };

export const OrderConfirmation = ({ locale = "cs" }: OrderConfirmationProps) => {
  const tr = t(locale);
  return (
    <Layout preview={locale === "cs" ? "Potvrzení objednávky" : "Potvrdenie objednávky"} locale={locale}>
      <Heading as="h2" style={heading}>
        {locale === "cs" ? "Děkujeme za objednávku, {{name}}!" : "Ďakujeme za objednávku, {{name}}!"}
      </Heading>
      <Text style={paragraph}>
        {locale === "cs"
          ? "Vaše objednávka č. {{orderId}} byla úspěšně zaplacena."
          : "Vaša objednávka č. {{orderId}} bola úspešne zaplatená."}
      </Text>
      <Hr style={divider} />
      <Text style={label}>Položky:</Text>
      <Text style={paragraph}>{"{{items}}"}</Text>
      <Hr style={divider} />
      <Text style={total}>
        {locale === "cs" ? "Celkem: {{totalAmount}} {{currency}}" : "Celkom: {{totalAmount}} {{currency}}"}
      </Text>
      <Text style={closing}>{tr.closing}</Text>
    </Layout>
  );
};

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#3D3530", fontSize: "22px", fontWeight: "700" };
const paragraph: React.CSSProperties = { margin: "0 0 12px", color: "#3D3530", fontSize: "14px", lineHeight: "1.6" };
const label: React.CSSProperties = { margin: "0 0 8px", color: "#7A7068", fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const total: React.CSSProperties = { margin: "0 0 24px", color: "#3D3530", fontSize: "18px", fontWeight: "700" };
const divider: React.CSSProperties = { margin: "16px 0", borderColor: "#E8E2DA" };
const closing: React.CSSProperties = { margin: "24px 0 0", color: "#7A7068", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" as const };

export default OrderConfirmation;
