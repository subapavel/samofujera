"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface PageIdContextValue {
  pageId: string | null;
  setPageId: (id: string | null) => void;
}

const PageIdContext = createContext<PageIdContextValue>({
  pageId: null,
  setPageId: () => {},
});

export function usePageId() {
  return useContext(PageIdContext);
}

export function PageIdProvider({ children }: { children: ReactNode }) {
  const [pageId, setPageId] = useState<string | null>(null);

  return (
    <PageIdContext value={{ pageId, setPageId }}>
      {children}
    </PageIdContext>
  );
}

/** Render this inside a server page component to set the page ID for AdminBar */
export function SetPageId({ id }: { id: string }) {
  const { setPageId } = usePageId();

  useEffect(() => {
    setPageId(id);
    return () => setPageId(null);
  }, [id, setPageId]);

  return null;
}
