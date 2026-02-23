"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { SearchProvider } from "./search-provider";
import { SearchCommand } from "./search-command";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SearchProvider>
          {children}
          <SearchCommand />
        </SearchProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
