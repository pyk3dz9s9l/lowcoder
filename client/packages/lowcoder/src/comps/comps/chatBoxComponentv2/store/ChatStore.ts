import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import alasql from "alasql";
import type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
  ChatStoreListener,
} from "./types";
import { uid } from "./types";

const PERSIST_DEBOUNCE_MS = 500;

/**
 * Unified chat store backed by YJS (real-time CRDT sync) and ALAsql
 * (browser-local persistence). On init the ALAsql data seeds the YJS
 * doc so state survives page reloads even without a server. YJS map
 * observers write changes back to ALAsql automatically.
 */
export class ChatStore {
  private ydoc: Y.Doc | null = null;
  private wsProvider: WebsocketProvider | null = null;
  private messagesMap: Y.Map<any> | null = null;
  private roomsMap: Y.Map<any> | null = null;
  private membersMap: Y.Map<any> | null = null;
  private typingYMap: Y.Map<any> | null = null;

  private listeners = new Set<ChatStoreListener>();
  private ready = false;
  private wsConnected = false;

  private dbName: string;
  private dbReady = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private applicationId: string;
  private wsUrl: string;

  private static docs = new Map<string, Y.Doc>();
  private static providers = new Map<string, WebsocketProvider>();
  private static refCounts = new Map<string, number>();

  constructor(applicationId: string, wsUrl: string) {
    this.applicationId = applicationId;
    this.wsUrl = wsUrl;
    this.dbName = `ChatV2_${applicationId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  }

  isReady(): boolean {
    return this.ready;
  }

  getConnectionLabel(): string {
    if (!this.ready) return "Connecting...";
    return this.wsConnected ? "Online" : "Offline (local)";
  }

  async init(): Promise<void> {
    if (this.ready) return;

    await this.initDb();

    const docId = `chatv2_${this.applicationId}`;
    let ydoc = ChatStore.docs.get(docId);
    let isNewDoc = false;

    if (!ydoc) {
      ydoc = new Y.Doc();
      ChatStore.docs.set(docId, ydoc);
      ChatStore.refCounts.set(docId, 1);
      isNewDoc = true;
    } else {
      ChatStore.refCounts.set(
        docId,
        (ChatStore.refCounts.get(docId) || 0) + 1,
      );
    }

    this.ydoc = ydoc;
    this.messagesMap = ydoc.getMap("messages");
    this.roomsMap = ydoc.getMap("rooms");
    this.membersMap = ydoc.getMap("members");
    this.typingYMap = ydoc.getMap("typing");

    if (isNewDoc) {
      await this.hydrateFromDb();
    }

    let wsProvider = ChatStore.providers.get(docId);
    if (!wsProvider) {
      wsProvider = new WebsocketProvider(this.wsUrl, docId, ydoc, {
        connect: true,
      });
      ChatStore.providers.set(docId, wsProvider);
    }
    this.wsProvider = wsProvider;

    this.messagesMap.observe(() => {
      this.schedulePersist();
      this.notify(new Set(["messages"]));
    });
    this.roomsMap.observe(() => {
      this.schedulePersist();
      this.notify(new Set(["rooms"]));
    });
    this.membersMap.observe(() => {
      this.schedulePersist();
      this.notify(new Set(["members"]));
    });
    this.typingYMap.observe(() => this.notify(new Set(["typing"])));

    wsProvider.on("status", (e: { status: string }) => {
      this.wsConnected = e.status === "connected";
      this.notify(new Set(["connection"]));
    });
    this.wsConnected = wsProvider.wsconnected;

    this.ready = true;
    this.notify(new Set(["connection"]));
  }

  destroy(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    this.persistToDb();

    if (this.ydoc) {
      const docId = `chatv2_${this.applicationId}`;
      const count = (ChatStore.refCounts.get(docId) || 1) - 1;
      if (count <= 0) {
        ChatStore.providers.get(docId)?.destroy();
        ChatStore.providers.delete(docId);
        ChatStore.docs.delete(docId);
        ChatStore.refCounts.delete(docId);
      } else {
        ChatStore.refCounts.set(docId, count);
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

  // ── ALAsql persistence ────────────────────────────────────────────────

  private async initDb(): Promise<void> {
    alasql.options.autocommit = true;
    await alasql.promise(
      `CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ${this.dbName}`,
    );
    await alasql.promise(`ATTACH LOCALSTORAGE DATABASE ${this.dbName}`);
    await alasql.promise(`USE ${this.dbName}`);

    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS rooms (
        id STRING PRIMARY KEY, name STRING, description STRING,
        type STRING, creatorId STRING, createdAt NUMBER, updatedAt NUMBER
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS messages (
        id STRING PRIMARY KEY, roomId STRING, authorId STRING,
        authorName STRING, text STRING, timestamp NUMBER
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS members (
        roomId STRING, userId STRING, userName STRING, joinedAt NUMBER
      )
    `);
    this.dbReady = true;
  }

  private async hydrateFromDb(): Promise<void> {
    if (!this.dbReady) return;

    const rooms = (await alasql.promise(
      `SELECT * FROM rooms`,
    )) as ChatRoom[];
    for (const r of rooms) {
      if (!this.roomsMap!.has(r.id)) this.roomsMap!.set(r.id, r);
    }

    const messages = (await alasql.promise(
      `SELECT * FROM messages`,
    )) as ChatMessage[];
    for (const m of messages) {
      if (!this.messagesMap!.has(m.id)) this.messagesMap!.set(m.id, m);
    }

    const members = (await alasql.promise(
      `SELECT * FROM members`,
    )) as RoomMember[];
    for (const m of members) {
      const key = `${m.roomId}::${m.userId}`;
      if (!this.membersMap!.has(key)) this.membersMap!.set(key, m);
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistToDb();
    }, PERSIST_DEBOUNCE_MS);
  }

  private persistToDb(): void {
    if (!this.dbReady) return;
    try {
      alasql(`DELETE FROM rooms`);
      this.roomsMap?.forEach((v) => {
        const r = v as ChatRoom;
        alasql(`INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          r.id, r.name, r.description, r.type,
          r.creatorId, r.createdAt, r.updatedAt,
        ]);
      });

      alasql(`DELETE FROM messages`);
      this.messagesMap?.forEach((v) => {
        const m = v as ChatMessage;
        alasql(`INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)`, [
          m.id, m.roomId, m.authorId, m.authorName, m.text, m.timestamp,
        ]);
      });

      alasql(`DELETE FROM members`);
      this.membersMap?.forEach((v: any) => {
        alasql(`INSERT INTO members VALUES (?, ?, ?, ?)`, [
          v.roomId, v.userId, v.userName, v.joinedAt,
        ]);
      });
    } catch {
      /* persistence is best-effort */
    }
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
    const room: ChatRoom = {
      id: roomId, name, description, type,
      creatorId, createdAt: now, updatedAt: now,
    };
    this.ydoc!.transact(() => {
      this.roomsMap!.set(roomId, room);
      this.membersMap!.set(`${roomId}::${creatorId}`, {
        roomId, userId: creatorId, userName: creatorName, joinedAt: now,
      } as RoomMember);
    });
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

  async getSearchableRooms(
    userId: string,
    query: string,
  ): Promise<ChatRoom[]> {
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
      if (
        r.name.toLowerCase().includes(lq) ||
        r.description.toLowerCase().includes(lq)
      ) {
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

  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
  ): Promise<boolean> {
    this.assert();
    const key = `${roomId}::${userId}`;
    if (this.membersMap!.has(key)) return true;
    this.membersMap!.set(key, {
      roomId, userId, userName, joinedAt: Date.now(),
    } as RoomMember);
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    this.membersMap!.delete(`${roomId}::${userId}`);
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
    return this.membersMap!.has(`${roomId}::${userId}`);
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
    this.ydoc!.transact(() => {
      this.messagesMap!.set(msg.id, msg);
      const room = this.roomsMap!.get(roomId) as ChatRoom | undefined;
      if (room) {
        this.roomsMap!.set(roomId, { ...room, updatedAt: msg.timestamp });
      }
    });
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

  startTyping(roomId: string, userId: string, userName: string): void {
    this.typingYMap?.set(`${roomId}::${userId}`, {
      userId, userName, roomId, startedAt: Date.now(),
    } as TypingUser);
  }

  stopTyping(roomId: string, userId: string): void {
    this.typingYMap?.delete(`${roomId}::${userId}`);
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
    if (!this.ready)
      throw new Error("ChatStore not initialized. Call init() first.");
  }
}
