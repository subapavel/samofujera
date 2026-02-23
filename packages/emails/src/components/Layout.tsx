import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Heading,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview?: string;
  children: React.ReactNode;
}

export const Layout = ({ preview, children }: LayoutProps) => (
  <Html lang="cs">
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading as="h1" style={brandHeading}>
            Sámo Fujera
          </Heading>
        </Section>

        <Section style={content}>{children}</Section>

        <Hr style={divider} />

        <Section style={footer}>
          <Text style={footerText}>
            &copy; 2026 Sámo Fujera. Všechna práva vyhrazena.
          </Text>
          <Text style={footerText}>
            Pokud si nepřejete dostávat tyto e-maily, můžete se{" "}
            {"{{unsubscribeLink}}"}odhlásit.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  margin: "0 auto",
  padding: "0",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 0",
  maxWidth: "560px",
};

const header: React.CSSProperties = {
  backgroundColor: "#18181b",
  padding: "24px 32px",
  borderRadius: "8px 8px 0 0",
};

const brandHeading: React.CSSProperties = {
  margin: "0",
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px",
};

const divider: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#fafafa",
  padding: "16px 32px",
  borderRadius: "0 0 8px 8px",
  borderTop: "1px solid #e4e4e7",
};

const footerText: React.CSSProperties = {
  margin: "0",
  color: "#a1a1aa",
  fontSize: "12px",
  textAlign: "center" as const,
  lineHeight: "20px",
};
