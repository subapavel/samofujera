import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  paragraph: "mb-4",
  heading: {
    h1: "pb-4",
    h2: "pb-3.5",
    h3: "pb-2",
    h4: "pb-2",
    h5: "pb-1.5",
    h6: "pb-1",
  },
  quote: "border-l-4 border-[#065d4d] pl-4 italic text-black mb-4",
  list: {
    ul: "list-disc pl-6 mb-4",
    ol: "list-decimal pl-6 mb-4",
    listitem: "mb-1",
  },
  link: "text-[rgb(6,93,77)] underline hover:no-underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
};
