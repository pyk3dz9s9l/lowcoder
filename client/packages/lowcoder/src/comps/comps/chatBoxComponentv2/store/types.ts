export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: "public" | "private";
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
  startedAt: number;
}

export type ChangeType = "rooms" | "messages" | "members" | "typing" | "connection";

export type ChatStoreListener = (changes: Set<ChangeType>) => void;

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
