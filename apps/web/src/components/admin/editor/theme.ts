import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  paragraph: "public-body-110 mb-4",
  heading: {
    h1: "public-h1 pb-4",
    h2: "public-h2-sm pb-3.5",
    h3: "public-h3 pb-2",
    h4: "text-lg font-semibold pb-2",
    h5: "text-base font-semibold pb-1.5",
    h6: "text-sm font-semibold pb-1",
  },
  quote: "border-l-4 border-[rgb(6,93,77)]/30 pl-4 italic text-[var(--muted-foreground)] mb-4",
  list: {
    ul: "list-disc pl-6 mb-4 public-body-110",
    ol: "list-decimal pl-6 mb-4 public-body-110",
    listitem: "mb-1",
  },
  link: "text-[rgb(6,93,77)] underline hover:no-underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
};
