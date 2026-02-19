import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  paragraph: "mb-0 last:mb-0",
  heading: {
    h1: "mb-0",
    h2: "mb-0",
    h3: "mb-0",
    h4: "mb-0",
    h5: "mb-0",
    h6: "mb-0",
  },
  quote: "border-l-4 border-[#065d4d] pl-4 italic text-black mb-0",
  list: {
    ul: "list-disc pl-6 mb-0",
    ol: "list-decimal pl-6 mb-0",
    listitem: "mb-0",
  },
  link: "text-[rgb(6,93,77)] underline hover:no-underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
};
