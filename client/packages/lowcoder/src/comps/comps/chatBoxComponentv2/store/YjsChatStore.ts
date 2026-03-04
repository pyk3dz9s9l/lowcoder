import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
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

export class YjsChatStore implements IChatStore {
  private ydoc: Y.Doc | null = null;
  private wsProvider: WebsocketProvider | null = null;
  private messagesMap: Y.Map<any> | null = null;
  private roomsMap: Y.Map<any> | null = null;
  private membersMap: Y.Map<any> | null = null;
  private typingYMap: Y.Map<any> | null = null;
  private listeners = new Set<ChatStoreListener>();
  private ready = false;
  private wsConnected = false;

  private applicationId: string;
  private wsUrl: string;

  private static docs = new Map<string, Y.Doc>();
  private static providers = new Map<string, WebsocketProvider>();
  private static refCounts = new Map<string, number>();

  constructor(applicationId: string, wsUrl: string) {
    this.applicationId = applicationId;
    this.wsUrl = wsUrl;
  }

  isReady(): boolean {
    return this.ready;
  }

  isWsConnected(): boolean {
    return this.wsConnected;
  }

  getConnectionLabel(): string {
    if (!this.ready) return "Connecting...";
    return this.wsConnected ? "Online" : "Offline (local Yjs)";
  }

  async init(): Promise<void> {
    if (this.ready) return;

    const docId = `chatv2_${this.applicationId}`;

    let ydoc = YjsChatStore.docs.get(docId);
    let wsProvider = YjsChatStore.providers.get(docId);

    if (!ydoc) {
      ydoc = new Y.Doc();
      YjsChatStore.docs.set(docId, ydoc);
      YjsChatStore.refCounts.set(docId, 1);

      wsProvider = new WebsocketProvider(this.wsUrl, docId, ydoc, { connect: true });
      YjsChatStore.providers.set(docId, wsProvider);
    } else {
      YjsChatStore.refCounts.set(docId, (YjsChatStore.refCounts.get(docId) || 0) + 1);
      wsProvider = YjsChatStore.providers.get(docId)!;
    }

    this.ydoc = ydoc;
    this.wsProvider = wsProvider;
    this.messagesMap = ydoc.getMap("messages");
    this.roomsMap = ydoc.getMap("rooms");
    this.membersMap = ydoc.getMap("members");
    this.typingYMap = ydoc.getMap("typing");

    this.messagesMap.observe(() => this.notify(new Set(["messages"])));
    this.roomsMap.observe(() => this.notify(new Set(["rooms"])));
    this.membersMap.observe(() => this.notify(new Set(["members"])));
    this.typingYMap.observe(() => this.notify(new Set(["typing"])));

    if (wsProvider) {
      wsProvider.on("status", (e: { status: string }) => {
        this.wsConnected = e.status === "connected";
        this.notify(new Set(["connection"]));
      });
      this.wsConnected = wsProvider.wsconnected;
    }

    this.ready = true;
    this.notify(new Set(["connection"]));
  }

  destroy(): void {
    if (this.ydoc) {
      const docId = `chatv2_${this.applicationId}`;
      const count = (YjsChatStore.refCounts.get(docId) || 1) - 1;
      if (count <= 0) {
        YjsChatStore.providers.get(docId)?.destroy();
        YjsChatStore.providers.delete(docId);
        YjsChatStore.docs.delete(docId);
        YjsChatStore.refCounts.delete(docId);
      } else {
        YjsChatStore.refCounts.set(docId, count);
      }
    }
    this.ydoc = null;
    this.wsProvider = null;
    this.messagesMap = null;
    this.roomsMap = null;
    this.membersMap = null;
    this.typingYMap = null;
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

  // ── Rooms ──────────────────────────────────────────────────────────────

  async createRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
    description = "",
    id?: string,
  ): Promise<ChatRoom> {
    this.assert();
    const roomId = id ?? uid();
    const now = Date.now();
    const room: ChatRoom = { id: roomId, name, description, type, creatorId, createdAt: now, updatedAt: now };
    this.roomsMap!.set(roomId, room);
    this.addMemberEntry(roomId, creatorId, creatorName, now);
    return room;
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    this.assert();
    return (this.roomsMap!.get(roomId) as ChatRoom) ?? null;
  }

  async getRoomByName(name: string): Promise<ChatRoom | null> {
    this.assert();
    for (const room of this.roomsMap!.values()) {
      if ((room as ChatRoom).name === name) return room as ChatRoom;
    }
    return null;
  }

  async getAllRooms(): Promise<ChatRoom[]> {
    this.assert();
    const rooms: ChatRoom[] = [];
    this.roomsMap!.forEach((v) => rooms.push(v as ChatRoom));
    rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    return rooms;
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    this.assert();
    const memberRoomIds = new Set<string>();
    this.membersMap!.forEach((v: any) => {
      if (v.userId === userId) memberRoomIds.add(v.roomId);
    });
    const rooms: ChatRoom[] = [];
    this.roomsMap!.forEach((v) => {
      const r = v as ChatRoom;
      if (memberRoomIds.has(r.id)) rooms.push(r);
    });
    rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    return rooms;
  }

  async getSearchableRooms(userId: string, query: string): Promise<ChatRoom[]> {
    this.assert();
    const memberRoomIds = new Set<string>();
    this.membersMap!.forEach((v: any) => {
      if (v.userId === userId) memberRoomIds.add(v.roomId);
    });
    const lq = query.toLowerCase();
    const rooms: ChatRoom[] = [];
    this.roomsMap!.forEach((v) => {
      const r = v as ChatRoom;
      if (r.type !== "public") return;
      if (memberRoomIds.has(r.id)) return;
      if (r.name.toLowerCase().includes(lq) || r.description.toLowerCase().includes(lq)) {
        rooms.push(r);
      }
    });
    rooms.sort((a, b) => b.updatedAt - a.updatedAt);
    return rooms;
  }

  async ensureRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
  ): Promise<ChatRoom> {
    let room = await this.getRoomByName(name);
    if (!room) room = await this.createRoom(name, type, creatorId, creatorName);
    if (!(await this.isMember(room.id, creatorId)))
      await this.joinRoom(room.id, creatorId, creatorName);
    return room;
  }

  // ── Membership ─────────────────────────────────────────────────────────

  private memberKey(roomId: string, userId: string) {
    return `${roomId}::${userId}`;
  }

  private addMemberEntry(roomId: string, userId: string, userName: string, joinedAt: number) {
    this.membersMap!.set(this.memberKey(roomId, userId), {
      roomId,
      userId,
      userName,
      joinedAt,
    } as RoomMember);
  }

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    this.assert();
    const key = this.memberKey(roomId, userId);
    if (this.membersMap!.has(key)) return true;
    this.addMemberEntry(roomId, userId, userName, Date.now());
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    this.membersMap!.delete(this.memberKey(roomId, userId));
    return true;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    this.assert();
    const members: RoomMember[] = [];
    this.membersMap!.forEach((v: any) => {
      if (v.roomId === roomId) members.push(v as RoomMember);
    });
    members.sort((a, b) => a.joinedAt - b.joinedAt);
    return members;
  }

  async isMember(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    return this.membersMap!.has(this.memberKey(roomId, userId));
  }

  // ── Messages ───────────────────────────────────────────────────────────

  async sendMessage(
    roomId: string,
    authorId: string,
    authorName: string,
    text: string,
    id?: string,
  ): Promise<ChatMessage> {
    this.assert();
    const msg: ChatMessage = {
      id: id ?? uid(),
      roomId,
      authorId,
      authorName,
      text,
      timestamp: Date.now(),
    };
    this.messagesMap!.set(msg.id, msg);
    const room = this.roomsMap!.get(roomId) as ChatRoom | undefined;
    if (room) {
      this.roomsMap!.set(roomId, { ...room, updatedAt: msg.timestamp });
    }
    return msg;
  }

  async getMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
    this.assert();
    const msgs: ChatMessage[] = [];
    this.messagesMap!.forEach((v) => {
      const m = v as ChatMessage;
      if (m.roomId === roomId) msgs.push(m);
    });
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    return msgs.slice(-limit);
  }

  // ── Typing ─────────────────────────────────────────────────────────────

  private typingKey(roomId: string, userId: string) {
    return `${roomId}::${userId}`;
  }

  startTyping(roomId: string, userId: string, userName: string): void {
    this.typingYMap?.set(this.typingKey(roomId, userId), {
      userId,
      userName,
      roomId,
      startedAt: Date.now(),
    } as TypingUser);
  }

  stopTyping(roomId: string, userId: string): void {
    this.typingYMap?.delete(this.typingKey(roomId, userId));
  }

  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[] {
    if (!this.typingYMap) return [];
    const now = Date.now();
    const result: TypingUser[] = [];
    this.typingYMap.forEach((v: any, key: string) => {
      const entry = v as TypingUser;
      if (entry.roomId !== roomId) return;
      if (excludeUserId && entry.userId === excludeUserId) return;
      if (now - entry.startedAt > 5000) {
        this.typingYMap!.delete(key);
        return;
      }
      result.push(entry);
    });
    return result;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private assert(): void {
    if (!this.ready) throw new Error("YjsChatStore not initialized. Call init() first.");
  }
}
