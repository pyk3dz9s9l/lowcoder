export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
  authorType?: "user" | "assistant";
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: "public" | "private" | "llm";
  llmQueryName?: string;
  creatorId: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoomMember {
  roomId: string;
  userId: string;
  userName: string;
  joinedAt: number;
}

export interface RoomInvite {
  id: string;
  roomId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  respondedAt?: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  roomId: string;
}

export const LLM_BOT_AUTHOR_ID = "__llm_bot__";

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
