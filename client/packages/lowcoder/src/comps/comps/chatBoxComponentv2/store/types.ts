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

export type SyncMode = "local" | "collaborative" | "hybrid";

export interface IChatStore {
  init(): Promise<void>;
  destroy(): void;
  subscribe(listener: ChatStoreListener): () => void;
  isReady(): boolean;
  getConnectionLabel(): string;

  createRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
    description?: string,
    id?: string,
  ): Promise<ChatRoom>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  getRoomByName(name: string): Promise<ChatRoom | null>;
  getAllRooms(): Promise<ChatRoom[]>;
  getUserRooms(userId: string): Promise<ChatRoom[]>;
  getSearchableRooms(userId: string, query: string): Promise<ChatRoom[]>;
  ensureRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
  ): Promise<ChatRoom>;

  joinRoom(roomId: string, userId: string, userName: string): Promise<boolean>;
  leaveRoom(roomId: string, userId: string): Promise<boolean>;
  getRoomMembers(roomId: string): Promise<RoomMember[]>;
  isMember(roomId: string, userId: string): Promise<boolean>;

  sendMessage(
    roomId: string,
    authorId: string,
    authorName: string,
    text: string,
    id?: string,
  ): Promise<ChatMessage>;
  getMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;

  startTyping(roomId: string, userId: string, userName: string): void;
  stopTyping(roomId: string, userId: string): void;
  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[];
}

export function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
