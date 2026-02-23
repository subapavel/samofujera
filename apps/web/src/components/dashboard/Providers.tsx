"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "../i18n-provider";

interface ProvidersProps {
  locale?: string;
  children: ReactNode;
}

export function Providers({ locale, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <I18nProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
