import { fetchQuery } from "convex/nextjs";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await fetchQuery(
    api.suggestions.getSuggestionsByDocumentId,
    {
      documentId: documentId as Id<"documents">,
    }
  );

  if (!suggestions.length) {
    return Response.json([], { status: 200 });
  }
  if (suggestions[0].userId !== (session.user.id as any)) {
    return new ChatSDKError("forbidden:api").toResponse();
  }

  return Response.json(
    suggestions.map((s) => ({ ...s, id: s._id })),
    { status: 200 }
  );
}
