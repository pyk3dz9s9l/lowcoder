export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
  /** Distinguishes human messages from LLM responses. Absent on legacy messages → treated as "user". */
  authorType?: "user" | "assistant";
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  /** "llm" rooms broadcast AI responses to every member via YJS. */
  type: "public" | "private" | "llm";
  /** Name of the Lowcoder query that handles LLM calls (only for type === "llm"). */
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

export interface TypingUser {
  userId: string;
  userName: string;
  roomId: string;
}

export type ChangeType = "rooms" | "messages" | "members" | "typing" | "connection";

export type ChatStoreListener = (changes: Set<ChangeType>) => void;

/** Fixed authorId used for all AI-generated messages so they are identifiable across rooms. */
export const LLM_BOT_AUTHOR_ID = "__llm_bot__";

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
