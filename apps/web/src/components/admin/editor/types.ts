import type { SerializedEditorState } from "lexical";

export interface PageSection {
  id: string;
  content: SerializedEditorState | null;
}

export interface SectionPageContent {
  version: 1;
  sections: PageSection[];
}
