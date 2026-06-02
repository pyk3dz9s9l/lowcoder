import type {
  AppendMessage,
  CompleteAttachment,
  TextMessagePart,
  ThreadAssistantMessagePart,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";

import type { ChatMessage, ChatMessageContent } from "../types/chatTypes";

export const generateMessageId = () => Math.random().toString(36).substr(2, 9);

export const getTextFromThreadContent = (
  content: ThreadMessageLike["content"]
) => {
  if (typeof content === "string") return content;

  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
};

export const generateThreadTitle = (message: ChatMessage) => {
  const text = getTextFromThreadContent(message.content)
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  if (text.length <= 50) return text;

  const clipped = text.slice(0, 50).replace(/\s+\S*$/, "").trim();
  return `${clipped || text.slice(0, 50).trim()}...`;
};

export const shouldGenerateThreadTitle = (
  existingTitle: string | undefined,
  defaultTitle: string,
  existingMessageCount: number
) => {
  return (
    existingMessageCount === 0 &&
    (!existingTitle || existingTitle.trim() === defaultTitle.trim())
  );
};

export const getTextFromAppendMessage = (message: AppendMessage) => {
  const textPart = message.content.find(
    (part): part is TextMessagePart => part.type === "text"
  );
  return textPart?.text?.trim() ?? "";
};

export const createUserMessage = (
  text: string,
  attachments: CompleteAttachment[] = []
): ChatMessage => {
  const content: ThreadUserMessagePart[] = text
    ? [{ type: "text", text }]
    : [];

  return {
    id: generateMessageId(),
    role: "user",
    content,
    createdAt: new Date(),
    ...(attachments.length && { attachments }),
  };
};

export const createAssistantErrorMessage = (text: string): ChatMessage => ({
  id: generateMessageId(),
  role: "assistant",
  content: [{ type: "text", text }],
  createdAt: new Date(),
});

export const toChatMessage = (message: ThreadMessageLike): ChatMessage => {
  if (message.role === "system") {
    throw new Error("System messages are not stored in chat threads");
  }

  const content =
    typeof message.content === "string"
      ? ([{ type: "text", text: message.content }] as ChatMessageContent)
      : (message.content as ChatMessageContent);

  return {
    ...message,
    id: message.id ?? generateMessageId(),
    role: message.role,
    content,
    createdAt: message.createdAt ?? new Date(),
  };
};

export const toAssistantMessage = (message: ThreadMessageLike): ChatMessage => {
  const chatMessage = toChatMessage(message);
  if (chatMessage.role !== "assistant") {
    throw new Error("Query must return an assistant message");
  }
  return chatMessage;
};

export const getAutomatorActionsFromMessage = (message: ChatMessage) => {
  const toolPart = message.content.find(
    (part): part is Extract<ThreadAssistantMessagePart, { type: "tool-call" }> =>
      part.type === "tool-call" &&
      part.toolName === "execute_automator_actions"
  );

  if (!toolPart) return [];

  const resultActions = (toolPart.result as any)?.actions;
  return Array.isArray(resultActions) ? resultActions : [];
};
