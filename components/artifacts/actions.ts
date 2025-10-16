"use server";

import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await fetchQuery(
    api.suggestions.getSuggestionsByDocumentId,
    {
      documentId: documentId as Id<"documents">,
    }
  );
  return suggestions.map((s) => ({ ...s, id: s._id }));
}
