import { LocalChatStore } from "./LocalChatStore";
import { YjsChatStore } from "./YjsChatStore";
import type {
  IChatStore,
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
  ChatStoreListener,
} from "./types";
import { uid } from "./types";

/**
 * Wraps both a LocalChatStore and a YjsChatStore. Writes go to both;
 * reads prefer Yjs when the WebSocket is connected, otherwise fall back to
 * local. IDs are generated once and passed to both sub-stores so the same
 * logical entity keeps a consistent identity across both.
 */
export class HybridChatStore implements IChatStore {
  private local: LocalChatStore;
  private yjs: YjsChatStore;
  private listeners = new Set<ChatStoreListener>();
  private ready = false;

  constructor(applicationId: string, wsUrl: string) {
    this.local = new LocalChatStore(applicationId);
    this.yjs = new YjsChatStore(applicationId, wsUrl);
  }

  isReady(): boolean {
    return this.ready;
  }

  getConnectionLabel(): string {
    if (!this.ready) return "Connecting...";
    const yjsLabel = this.yjs.getConnectionLabel();
    return `Hybrid (${yjsLabel})`;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    await this.local.init();
    try {
      await this.yjs.init();
    } catch { /* yjs offline, that's fine */ }
    this.ready = true;

    this.local.subscribe((changes) => this.notify(changes));
    this.yjs.subscribe((changes) => this.notify(changes));
  }

  destroy(): void {
    this.local.destroy();
    this.yjs.destroy();
    this.listeners.clear();
    this.ready = false;
  }

  subscribe(listener: ChatStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(changes: Set<ChangeType>): void {
    this.listeners.forEach((fn) => fn(changes));
  }

  private get reader(): IChatStore {
    return this.yjs.isReady() ? this.yjs : this.local;
  }

  // ── Rooms (write to both with shared ID, read from best available) ────

  async createRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
    description?: string,
    id?: string,
  ): Promise<ChatRoom> {
    const sharedId = id ?? uid();
    const room = await this.local.createRoom(name, type, creatorId, creatorName, description, sharedId);
    if (this.yjs.isReady()) {
      try {
        await this.yjs.createRoom(name, type, creatorId, creatorName, description, sharedId);
      } catch { /* offline */ }
    }
    return room;
  }

  async getRoom(roomId: string) { return this.reader.getRoom(roomId); }
  async getRoomByName(name: string) { return this.reader.getRoomByName(name); }
  async getAllRooms() { return this.reader.getAllRooms(); }
  async getUserRooms(userId: string) { return this.reader.getUserRooms(userId); }
  async getSearchableRooms(userId: string, query: string) { return this.reader.getSearchableRooms(userId, query); }

  async ensureRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
  ): Promise<ChatRoom> {
    const room = await this.local.ensureRoom(name, type, creatorId, creatorName);
    if (this.yjs.isReady()) {
      try {
        await this.yjs.ensureRoom(name, type, creatorId, creatorName);
      } catch { /* offline */ }
    }
    return room;
  }

  // ── Membership (write to both) ─────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    const ok = await this.local.joinRoom(roomId, userId, userName);
    if (this.yjs.isReady()) {
      try { await this.yjs.joinRoom(roomId, userId, userName); } catch { /* offline */ }
    }
    return ok;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const ok = await this.local.leaveRoom(roomId, userId);
    if (this.yjs.isReady()) {
      try { await this.yjs.leaveRoom(roomId, userId); } catch { /* offline */ }
    }
    return ok;
  }

  async getRoomMembers(roomId: string) { return this.reader.getRoomMembers(roomId); }
  async isMember(roomId: string, userId: string) { return this.reader.isMember(roomId, userId); }

  // ── Messages (write to both with shared ID, read from best) ───────────

  async sendMessage(
    roomId: string,
    authorId: string,
    authorName: string,
    text: string,
    id?: string,
  ): Promise<ChatMessage> {
    const sharedId = id ?? uid();
    const msg = await this.local.sendMessage(roomId, authorId, authorName, text, sharedId);
    if (this.yjs.isReady()) {
      try {
        await this.yjs.sendMessage(roomId, authorId, authorName, text, sharedId);
      } catch { /* offline */ }
    }
    return msg;
  }

  async getMessages(roomId: string, limit?: number) { return this.reader.getMessages(roomId, limit); }

  // ── Typing (prefer Yjs for real-time sync, fallback to local) ─────────

  startTyping(roomId: string, userId: string, userName: string): void {
    if (this.yjs.isReady()) {
      this.yjs.startTyping(roomId, userId, userName);
    } else {
      this.local.startTyping(roomId, userId, userName);
    }
  }

  stopTyping(roomId: string, userId: string): void {
    if (this.yjs.isReady()) {
      this.yjs.stopTyping(roomId, userId);
    } else {
      this.local.stopTyping(roomId, userId);
    }
  }

  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[] {
    return this.yjs.isReady()
      ? this.yjs.getTypingUsers(roomId, excludeUserId)
      : this.local.getTypingUsers(roomId, excludeUserId);
  }
}
