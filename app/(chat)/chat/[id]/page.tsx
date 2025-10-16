import { fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { api } from "@/convex/_generated/api";
import { resolveChatIdentifier } from "@/convex/chats";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  // External first, fallback to internal only if non-UUID
  let chat: any = await fetchQuery(api.chats.getChatByExternalId, {
    externalId: id,
  });
  if (!chat && !id.includes("-")) {
    try {
      chat = await fetchQuery(api.chats.getChatById, { id: id as any });
    } catch (_) {
      // ignore invalid internal id fetch
    }
  }
  const normalizeChat = (c: any) =>
    c
      ? { ...c, id: c.externalId || c._id, createdAt: new Date(c.createdAt) }
      : null;
  chat = normalizeChat(chat);

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  let messagesFromDb: any[] = await fetchQuery(
    api.messages.getMessagesByExternalChatId,
    { externalId: id }
  );
  if (!messagesFromDb.length) {
    const internalId = await resolveChatIdentifier(id);
    if (internalId) {
      messagesFromDb = await fetchQuery(api.messages.getMessagesByChatId, {
        chatId: internalId,
      });
    }
  }
  const normalizedMessages = messagesFromDb.map((m: any) => ({
    ...m,
    id: m._id,
    chatId: id,
    role: m.role,
    content: m.parts || [],
    parts: m.parts,
    experimental_attachments: m.attachments,
    createdAt: new Date(m.createdAt),
  }));
  const uiMessages = convertToUIMessages(normalizedMessages);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={chat.lastContext ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={chat.lastContext ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
      />
      <DataStreamHandler />
    </>
  );
}
