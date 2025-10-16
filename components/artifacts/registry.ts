import { codeDocumentHandler } from "./code/server";
import type { DocumentHandler } from "./create-document-handler";
import { sheetDocumentHandler } from "./sheet/server";
import { textDocumentHandler } from "./text/server";

/*
 * Use this array to define the document handlers for each artifact kind.
 * Image artifacts are not persisted as documents (stream-only), so excluded.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
];

// Artifact kinds for document creation (exclude image)
export const artifactKinds = ["text", "code", "sheet"] as const;
