import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
} from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import { FEATURE_UPLOAD_FILES } from "@/lib/feature-flags";

// Use Blob instead of File for validation (Edge / Node forms)
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_UPLOAD_SIZE_BYTES, {
      message: `File size must be <= ${MAX_UPLOAD_SIZE_LABEL}`,
    })
    .refine((file) => ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as any), {
      message: `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_MIME_TYPES.join(", ")}`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FEATURE_UPLOAD_FILES) {
    return new ChatSDKError(
      "forbidden:feature",
      "File uploads disabled."
    ).toResponse();
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const original = formData.get("file");
    if (!original) {
      return NextResponse.json(
        { error: "No file uploaded", code: "no_file" },
        { status: 400 }
      );
    }
    const file = original as Blob; // Validation target
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((e) => e.message)
        .join(", ");
      return NextResponse.json(
        { error: errorMessage, code: "validation_failed" },
        { status: 400 }
      );
    }
    // Derive filename: if File present use its name, else synthesize
    const filenameCandidate = (original as any)?.name as string | undefined;
    const extension = file.type.split("/")[1] || "bin";
    const filename =
      filenameCandidate && filenameCandidate.length > 0
        ? filenameCandidate
        : `upload-${Date.now()}.${extension}`;

    try {
      // Generate upload URL for Convex
      const uploadUrl = await fetchMutation(api.files.generateUploadUrl);

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Save file metadata to database
      const fileId = await fetchMutation(api.files.saveFile, {
        storageId,
        name: filename,
        type: file.type,
        size: file.size,
        userId: session.user.id as any,
      });

      return NextResponse.json({
        storageId,
        fileId,
        url: uploadUrl, // Signed URL for upload; fetch actual URL later via getFile
        size: file.size,
        type: file.type,
        name: filename,
        pathname: filename, // match client expectation
        contentType: file.type,
        maxSize: MAX_UPLOAD_SIZE_BYTES,
        allowed: ALLOWED_UPLOAD_MIME_TYPES,
      });
    } catch (_error) {
      return NextResponse.json(
        { error: "Upload failed", code: "upload_failed" },
        { status: 500 }
      );
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request", code: "processing_failed" },
      { status: 500 }
    );
  }
}
