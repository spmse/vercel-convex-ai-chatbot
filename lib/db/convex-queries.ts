import "server-only";

import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import { generateHashedPassword } from "./utils";

// Types that match the original Drizzle types
export type User = {
  _id: Id<"users">;
  email: string;
  password?: string;
  type: "guest" | "regular";
  createdAt: number;
};

export type Chat = {
  _id: Id<"chats">;
  title: string;
  userId: Id<"users">;
  visibility: "public" | "private";
  createdAt: number;
  lastContext?: AppUsage | null;
};

export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  content?: any;
  parts?: any[];
  experimental_attachments?: any[];
  createdAt: Date;
};

export type Vote = {
  _id: Id<"votes">;
  chatId: Id<"chats">;
  messageId: Id<"messages">;
  isUpvoted: boolean;
};

export type Document = {
  _id: Id<"documents">;
  title: string;
  content?: string;
  kind: "text" | "code" | "image" | "sheet";
  userId: Id<"users">;
  createdAt: number;
};

export type Suggestion = {
  _id: Id<"suggestions">;
  documentId: Id<"documents">;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: Id<"users">;
  createdAt: number;
};

// Convert Convex ID format to string format used by the rest of the app
const convertIdToString = (id: Id<any>): string => id;
const convertStringToUserId = (id: string): Id<"users"> => id as Id<"users">;
const convertStringToChatId = (id: string): Id<"chats"> => id as Id<"chats">;
const convertStringToMessageId = (id: string): Id<"messages"> => id as Id<"messages">;
const convertStringToDocumentId = (id: string): Id<"documents"> => id as Id<"documents">;

export async function getUser(email: string): Promise<User[]> {
  try {
    const user = await fetchQuery(api.users.getUserByEmail, { email });
    return user ? [user] : [];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await fetchMutation(api.users.createUser, {
      email,
      password: hashedPassword,
      type: "regular",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  try {
    const user = await fetchMutation(api.users.createGuestUser, {});
    return [
      {
        id: convertIdToString(user!._id),
        email: user!.email,
      },
    ];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await fetchMutation(api.queries.saveChat, {
      title,
      userId: convertStringToUserId(userId),
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await fetchMutation(api.queries.deleteChatById, {
      id: convertStringToChatId(id),
    });
    return { id };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const chats = await fetchQuery(api.queries.getChatsByUserId, {
      userId: convertStringToUserId(id),
    });

    // Apply pagination logic (simplified version)
    const sortedChats = chats.sort((a, b) => b.createdAt - a.createdAt);
    
    let filteredChats = sortedChats;
    let startIndex = 0;

    if (startingAfter) {
      const afterIndex = filteredChats.findIndex(
        (chat) => convertIdToString(chat._id) === startingAfter
      );
      if (afterIndex !== -1) {
        startIndex = afterIndex + 1;
      }
    } else if (endingBefore) {
      const beforeIndex = filteredChats.findIndex(
        (chat) => convertIdToString(chat._id) === endingBefore
      );
      if (beforeIndex !== -1) {
        filteredChats = filteredChats.slice(0, beforeIndex);
      }
    }

    const paginatedChats = filteredChats.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filteredChats.length;

    return {
      chats: paginatedChats.map((chat) => ({
        ...chat,
        id: convertIdToString(chat._id),
        userId: convertIdToString(chat.userId),
        createdAt: new Date(chat.createdAt),
      })),
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const chat = await fetchQuery(api.queries.getChatById, {
      id: convertStringToChatId(id),
    });
    
    if (!chat) {
      return null;
    }
    
    return {
      ...chat,
      id: convertIdToString(chat._id),
      userId: convertIdToString(chat.userId),
      createdAt: new Date(chat.createdAt),
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chat by id"
    );
  }
}

export async function getMessagesByChatId({ chatId }: { chatId: string }) {
  try {
    const messages = await fetchQuery(api.queries.getMessagesByChatId, {
      chatId: convertStringToChatId(chatId),
    });
    
    return messages.map((message) => ({
      ...message,
      id: convertIdToString(message._id),
      chatId: convertIdToString(message.chatId),
      role: message.role as "user" | "assistant" | "system",
      content: message.parts || [],
      parts: message.parts,
      experimental_attachments: message.attachments,
      createdAt: new Date(message.createdAt),
    }));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function saveMessage({
  id,
  chatId,
  role,
  parts,
  attachments,
}: {
  id: string;
  chatId: string;
  role: string;
  parts: any;
  attachments: any;
}) {
  try {
    return await fetchMutation(api.queries.saveMessage, {
      chatId: convertStringToChatId(chatId),
      role,
      parts,
      attachments,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save message");
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const document = await fetchQuery(api.queries.getDocumentById, {
      id: convertStringToDocumentId(id),
    });
    
    if (!document) {
      return null;
    }
    
    return {
      ...document,
      id: convertIdToString(document._id),
      userId: convertIdToString(document.userId),
      content: document.content || "",
      createdAt: new Date(document.createdAt),
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  content,
  kind,
  userId,
}: {
  id: string;
  title: string;
  content?: string;
  kind: ArtifactKind;
  userId: string;
}) {
  try {
    return await fetchMutation(api.queries.saveDocument, {
      title,
      content,
      kind,
      userId: convertStringToUserId(userId),
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function deleteDocumentById({ id }: { id: string }) {
  try {
    await fetchMutation(api.queries.deleteDocumentById, {
      id: convertStringToDocumentId(id),
    });
    return { id };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete document by id"
    );
  }
}

export async function saveSuggestion({
  id,
  documentId,
  originalText,
  suggestedText,
  description,
  userId,
}: {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description?: string;
  userId: string;
}) {
  try {
    return await fetchMutation(api.queries.saveSuggestion, {
      documentId: convertStringToDocumentId(documentId),
      originalText,
      suggestedText,
      description,
      userId: convertStringToUserId(userId),
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save suggestion");
  }
}

export async function getVotesByChatId({ chatId }: { chatId: string }) {
  try {
    const votes = await fetchQuery(api.queries.getVotesByChatId, {
      chatId: convertStringToChatId(chatId),
    });
    
    return votes.map((vote) => ({
      ...vote,
      chatId: convertIdToString(vote.chatId),
      messageId: convertIdToString(vote.messageId),
    }));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveVote({
  chatId,
  messageId,
  isUpvoted,
}: {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}) {
  try {
    return await fetchMutation(api.queries.saveVote, {
      chatId: convertStringToChatId(chatId),
      messageId: convertStringToMessageId(messageId),
      isUpvoted,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save vote");
  }
}

// Additional functions that might be needed based on the original queries.ts file
export async function getDocumentsByUserId({
  userId,
  limit,
  offset,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const documents = await fetchQuery(api.queries.getDocumentsByUserId, {
      userId: convertStringToUserId(userId),
    });
    
    const processedDocs = documents.map((doc) => ({
      ...doc,
      id: convertIdToString(doc._id),
      userId: convertIdToString(doc.userId),
      createdAt: new Date(doc.createdAt),
    }));

    // Apply pagination if specified
    if (limit !== undefined) {
      const start = offset || 0;
      return processedDocs.slice(start, start + limit);
    }
    
    return processedDocs;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by user id"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const suggestions = await fetchQuery(api.queries.getSuggestionsByDocumentId, {
      documentId: convertStringToDocumentId(documentId),
    });
    
    return suggestions.map((suggestion) => ({
      ...suggestion,
      id: convertIdToString(suggestion._id),
      documentId: convertIdToString(suggestion.documentId),
      userId: convertIdToString(suggestion.userId),
      documentCreatedAt: suggestion.createdAt, // Using suggestion creation time as documentCreatedAt
      createdAt: new Date(suggestion.createdAt),
    }));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const message = await fetchQuery(api.queries.getMessageById, {
      id: convertStringToMessageId(id),
    });
    
    if (!message) {
      return [];
    }
    
    return [{
      ...message,
      id: convertIdToString(message._id),
      chatId: convertIdToString(message.chatId),
      createdAt: new Date(message.createdAt),
    }];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    await fetchMutation(api.queries.deleteMessagesByChatIdAfterTimestamp, {
      chatId: convertStringToChatId(chatId),
      timestamp: timestamp.getTime(),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages after timestamp"
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  try {
    await fetchMutation(api.queries.updateChatVisibility, {
      chatId: convertStringToChatId(chatId),
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility"
    );
  }
}

// Additional missing functions
export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    const results = [];
    for (const message of messages) {
      const result = await fetchMutation(api.queries.saveMessage, {
        chatId: convertStringToChatId(message.chatId),
        role: message.role,
        parts: message.parts || message.content,
        attachments: message.experimental_attachments || [],
      });
      results.push(result);
    }
    return results;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    return await fetchMutation(api.queries.voteMessage, {
      chatId: convertStringToChatId(chatId),
      messageId: convertStringToMessageId(messageId),
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streams = await fetchQuery(api.queries.getStreamsByChatId, {
      chatId: convertStringToChatId(chatId),
    });
    return streams.map((stream) => convertIdToString(stream._id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await fetchMutation(api.queries.createStream, {
      chatId: convertStringToChatId(chatId),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const count = await fetchQuery(api.queries.getMessageCountByUserId, {
      userId: convertStringToUserId(id),
      hoursAgo: differenceInHours,
    });
    return count;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  context: any;
}) {
  try {
    return await fetchMutation(api.queries.updateChatLastContext, {
      chatId: convertStringToChatId(chatId),
      context,
    });
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    return await fetchMutation(api.queries.deleteDocumentsByIdAfterTimestamp, {
      documentId: id,
      timestamp: timestamp.getTime(),
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await fetchQuery(api.queries.getDocumentsByUserId, {
      userId: convertStringToUserId(id),
    });
    
    return documents.map((doc) => ({
      ...doc,
      id: convertIdToString(doc._id),
      userId: convertIdToString(doc.userId),
      createdAt: new Date(doc.createdAt),
    }));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    const results = [];
    for (const suggestion of suggestions) {
      const result = await fetchMutation(api.queries.saveSuggestion, {
        documentId: convertStringToDocumentId(suggestion.documentId),
        originalText: suggestion.originalText,
        suggestedText: suggestion.suggestedText,
        description: suggestion.description,
        userId: convertStringToUserId(suggestion.userId),
      });
      results.push(result);
    }
    return results;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}
