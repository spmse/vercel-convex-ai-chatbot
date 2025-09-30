// Type definitions for database models
// These types match the Convex schema structure

export type User = {
  _id: string;
  _creationTime: number;
  email: string;
  password?: string;
};

export type Chat = {
  _id: string;
  _creationTime: number;
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  lastContext?: any;
  createdAt: Date;
};

export type Message = {
  _id: string;
  _creationTime: number;
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: any;
  parts?: any[];
  experimental_attachments?: any[];
  createdAt: Date;
};

// Alias for backward compatibility
export type DBMessage = Message;

export type Vote = {
  _id: string;
  _creationTime: number;
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type Document = {
  _id: string;
  _creationTime: number;
  id: string;
  title: string;
  content: string;
  kind: "text" | "code" | "image" | "sheet";
  userId: string;
  createdAt: Date;
};

export type Suggestion = {
  _id: string;
  _creationTime: number;
  id: string;
  documentId: string;
  documentCreatedAt?: Date | number; // Allow either a Date instance or timestamp (number) and make optional if missing
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
};

export type Stream = {
  _id: string;
  _creationTime: number;
  id: string;
  chatId: string;
};

export type ConvexFile = {
  _id: string;
  _creationTime: number;
  storageId: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
};
