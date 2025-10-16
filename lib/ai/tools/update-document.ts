import { tool, type UIMessageStreamWriter } from "ai";
import { fetchQuery } from "convex/nextjs";
import type { Session } from "next-auth";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/components/artifacts/registry";
import { api } from "@/convex/_generated/api";
import { resolveDocumentIdentifier } from "@/convex/documents";
import type { ChatMessage } from "@/lib/types";

type UpdateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async ({ id, description }) => {
      let raw = await fetchQuery(api.documents.getDocumentByExternalId, {
        externalId: id,
      });
      if (!raw) {
        const internalId = await resolveDocumentIdentifier(id);
        if (internalId) {
          raw = await fetchQuery(api.documents.getDocumentById, {
            id: internalId,
          });
        }
      }
      const document = raw
        ? {
            ...raw,
            id: raw._id,
            content: raw.content || "",
            createdAt: new Date(raw.createdAt),
          }
        : null;

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        session,
      });

      dataStream.write({ type: "data-finish", data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
