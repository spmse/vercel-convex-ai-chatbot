import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type { Session } from "next-auth";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { resolveDocumentIdentifier } from "@/convex/documents";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

type RequestSuggestionsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    inputSchema: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
    execute: async ({ documentId }) => {
      let raw = await fetchQuery(api.documents.getDocumentByExternalId, {
        externalId: documentId,
      });
      if (!raw) {
        const internalId = await resolveDocumentIdentifier(documentId);
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

      if (!document || !document.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: any[] = [];

      const { elementStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system:
          "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
        prompt: document.content,
        output: "array",
        schema: z.object({
          originalSentence: z.string().describe("The original sentence"),
          suggestedSentence: z.string().describe("The suggested sentence"),
          description: z.string().describe("The description of the suggestion"),
        }),
      });

      for await (const element of elementStream) {
        // @ts-expect-error todo: fix type
        const suggestion: Suggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          documentId,
          isResolved: false,
        };

        dataStream.write({
          type: "data-suggestion",
          data: suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      if (session.user?.id) {
        const userId = session.user.id;

        for (const suggestion of suggestions) {
          const internalId = await resolveDocumentIdentifier(documentId);
          await fetchMutation(api.suggestions.saveSuggestion, {
            documentId: (internalId || raw?._id) as any,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            description: suggestion.description,
            userId: userId as any,
          });
        }
      }

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });
