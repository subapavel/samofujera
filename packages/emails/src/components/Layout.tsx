import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Font,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  preview?: string;
  children: React.ReactNode;
  locale?: "cs" | "sk";
}

export const Layout = ({ preview, children, locale = "cs" }: LayoutProps) => (
  <Html lang={locale}>
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="Arial"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandName}>Sámo Fujera</Text>
        </Section>

        <Section style={content}>{children}</Section>

        <Hr style={divider} />

        <Section style={footer}>
          <Text style={footerText}>
            &copy; 2026 Sámo Fujera. Všechna práva vyhrazena.
          </Text>
          <Text style={footerText}>
            <a href="https://www.samofujera.cz" style={footerLink}>
              samofujera.cz
            </a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main: React.CSSProperties = {
  backgroundColor: "#F8F5F0",
  margin: "0 auto",
  padding: "0",
  fontFamily: "Inter, Arial, sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "40px 0",
  maxWidth: "560px",
};

const header: React.CSSProperties = {
  backgroundColor: "#8B7355",
  padding: "24px 32px",
  borderRadius: "8px 8px 0 0",
};

const brandName: React.CSSProperties = {
  margin: "0",
  color: "#FDFCFA",
  fontSize: "20px",
  fontWeight: "700",
  letterSpacing: "-0.02em",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px",
};

const divider: React.CSSProperties = {
  borderColor: "#E8E2DA",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#FDFCFA",
  padding: "16px 32px",
  borderRadius: "0 0 8px 8px",
  borderTop: "1px solid #E8E2DA",
};

const footerText: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#7A7068",
  fontSize: "12px",
  textAlign: "center" as const,
  lineHeight: "20px",
};

const footerLink: React.CSSProperties = {
  color: "#8B7355",
  textDecoration: "none",
};
