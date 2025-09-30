export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude 4 - Sonnet",
    description: "Advanced multimodal model with vision and text capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude 4 - Sonnet (Reasoning)",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
];
