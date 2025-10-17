"use server";

import { generateText, type UIMessage } from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveChatIdentifier } from "@/convex/chats";
import { myProvider } from "@/lib/ai/providers";
import { ChatSDKError } from "@/lib/errors";
import { FEATURE_SHARE_CONVERSATIONS } from "@/lib/feature-flags";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel("title-model"),
    system: `\n    - you will generate a short title based on the first message a user begins a conversation with\n    - ensure it is not more than 80 characters long\n    - the title should be a summary of the user's message\n    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });
  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const message = await fetchQuery(api.messages.getMessageById, {
    id: id as Id<"messages">,
  });
  if (!message) {
    return;
  }
  await fetchMutation(api.messages.deleteMessagesByChatIdAfterTimestamp, {
    chatId: message.chatId as Id<"chats">,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  if (!FEATURE_SHARE_CONVERSATIONS && visibility === "public") {
    throw new ChatSDKError(
      "forbidden:feature",
      "Conversation sharing disabled."
    );
  }
  const internalId = await resolveChatIdentifier(chatId);
  if (!internalId) {
    return;
  }
  await fetchMutation(api.chats.updateChatVisibility, {
    chatId: internalId,
    visibility,
  });
}
