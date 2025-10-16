import { fetchMutation, fetchQuery } from "convex/nextjs";
import { auth } from "@/app/(auth)/auth";
import type { ArtifactKind } from "@/components/artifact";
import { api } from "@/convex/_generated/api";
import { resolveDocumentIdentifier } from "@/convex/documents";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  // Try external id first
  let document = await fetchQuery(api.documents.getDocumentByExternalId, {
    externalId: id,
  });
  if (!document) {
    const internalId = await resolveDocumentIdentifier(id);
    if (internalId) {
      document = await fetchQuery(api.documents.getDocumentById, {
        id: internalId,
      });
    }
  }

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  return Response.json([
    { ...document, id: document._id, userId: document.userId },
  ]);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  let existing = await fetchQuery(api.documents.getDocumentByExternalId, {
    externalId: id,
  });
  if (!existing) {
    const internalId = await resolveDocumentIdentifier(id);
    if (internalId) {
      existing = await fetchQuery(api.documents.getDocumentById, {
        id: internalId,
      });
    }
  }
  if (existing && existing.userId !== (session.user.id as any)) {
    return new ChatSDKError("forbidden:document").toResponse();
  }
  if (!existing) {
    await fetchMutation(api.documents.saveDocument, {
      externalId: id,
      title,
      content,
      kind,
      userId: session.user.id as any,
    });
    return Response.json({ id, title, kind, content }, { status: 200 });
  }
  // update path
  await fetchMutation(api.documents.updateDocument, {
    id: existing._id,
    title,
    content,
  });
  return Response.json({ id, title, kind, content }, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter timestamp is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  let document = await fetchQuery(api.documents.getDocumentByExternalId, {
    externalId: id,
  });
  if (!document) {
    const internalId = await resolveDocumentIdentifier(id);
    if (internalId) {
      document = await fetchQuery(api.documents.getDocumentById, {
        id: internalId,
      });
    }
  }
  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }
  if (document.userId !== (session.user.id as any)) {
    return new ChatSDKError("forbidden:document").toResponse();
  }
  if (document.createdAt > new Date(timestamp).getTime()) {
    await fetchMutation(api.documents.deleteDocumentById, {
      id: document._id,
    });
    return Response.json({ id }, { status: 200 });
  }
  return Response.json({ id, deleted: false }, { status: 200 });
}
