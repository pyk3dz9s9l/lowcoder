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
import { uid, LLM_BOT_AUTHOR_ID } from "./types";

const PERSIST_DEBOUNCE_MS = 500;

/**
 * Unified chat store backed by YJS (real-time CRDT sync) and AlaSQL
 * (browser-local persistence). On init the AlaSQL data seeds the YJS
 * doc so state survives page reloads even without a server. YJS map
 * observers write changes back to AlaSQL automatically.
 *
 * LLM rooms: rooms with type === "llm" store a llmQueryName field. The
 * hook layer (useChatStore) is responsible for firing the query and
 * writing the AI response back as a message with authorType === "assistant".
 * All connected clients see the response via YJS sync automatically.
 */
export class ChatStore {
  private ydoc: Y.Doc | null = null;
  private wsProvider: WebsocketProvider | null = null;
  private messagesMap: Y.Map<any> | null = null;
  private roomsMap: Y.Map<any> | null = null;
  private membersMap: Y.Map<any> | null = null;
  private awarenessHandler: (() => void) | null = null;

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
      console.log(`[YJS] Created new document: ${docId}`);
    } else {
      ChatStore.refCounts.set(
        docId,
        (ChatStore.refCounts.get(docId) || 0) + 1,
      );
      console.log(`[YJS] Reusing existing document: ${docId}`);
    }

    this.ydoc = ydoc;
    this.messagesMap = ydoc.getMap("messages");
    this.roomsMap = ydoc.getMap("rooms");
    this.membersMap = ydoc.getMap("members");

    if (isNewDoc) {
      await this.hydrateFromDb();
    }

    let wsProvider = ChatStore.providers.get(docId);
    if (!wsProvider) {
      console.log(`[YJS] Creating WebSocket provider for ${docId} at ${this.wsUrl}`);
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

    const awarenessHandler = () => this.notify(new Set(["typing"]));
    wsProvider.awareness.on("change", awarenessHandler);
    this.awarenessHandler = awarenessHandler;

    wsProvider.on("status", (e: { status: string }) => {
      this.wsConnected = e.status === "connected";
      this.notify(new Set(["connection"]));
    });
    this.wsConnected = wsProvider.wsconnected;

    this.ready = true;
    console.log(`[YJS] ChatStore initialized for ${this.applicationId} (${this.wsConnected ? "online" : "offline"})`);
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

    if (this.wsProvider && this.awarenessHandler) {
      this.wsProvider.awareness.setLocalStateField("typing", null);
      this.wsProvider.awareness.off("change", this.awarenessHandler);
      this.awarenessHandler = null;
    }

    this.ydoc = null;
    this.wsProvider = null;
    this.messagesMap = null;
    this.roomsMap = null;
    this.membersMap = null;
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

  // ── AlaSQL persistence ─────────────────────────────────────────────────

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
        type STRING, llmQueryName STRING,
        creatorId STRING, createdAt NUMBER, updatedAt NUMBER
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS messages (
        id STRING PRIMARY KEY, roomId STRING, authorId STRING,
        authorName STRING, text STRING, timestamp NUMBER, authorType STRING
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS members (
        roomId STRING, userId STRING, userName STRING, joinedAt NUMBER
      )
    `);

    // Schema migration: add new columns to pre-existing tables that may
    // not have them. AlaSQL throws if the column already exists — that's fine.
    try { await alasql.promise(`ALTER TABLE rooms ADD COLUMN llmQueryName STRING`); } catch { /* already exists */ }
    try { await alasql.promise(`ALTER TABLE messages ADD COLUMN authorType STRING`); } catch { /* already exists */ }

    this.dbReady = true;
  }

  private async hydrateFromDb(): Promise<void> {
    if (!this.dbReady) return;

    const rooms = (await alasql.promise(`SELECT * FROM rooms`)) as ChatRoom[];
    for (const r of rooms) {
      if (!this.roomsMap!.has(r.id)) this.roomsMap!.set(r.id, r);
    }

    const messages = (await alasql.promise(`SELECT * FROM messages`)) as ChatMessage[];
    for (const m of messages) {
      if (!this.messagesMap!.has(m.id)) this.messagesMap!.set(m.id, m);
    }

    const members = (await alasql.promise(`SELECT * FROM members`)) as RoomMember[];
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
        alasql(`INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
          r.id, r.name, r.description, r.type, r.llmQueryName ?? null,
          r.creatorId, r.createdAt, r.updatedAt,
        ]);
      });

      alasql(`DELETE FROM messages`);
      this.messagesMap?.forEach((v) => {
        const m = v as ChatMessage;
        alasql(`INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          m.id, m.roomId, m.authorId, m.authorName, m.text, m.timestamp,
          m.authorType ?? null,
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
    type: "public" | "private" | "llm",
    creatorId: string,
    creatorName: string,
    description = "",
    llmQueryName?: string,
    id?: string,
  ): Promise<ChatRoom> {
    this.assert();
    const roomId = id ?? uid();
    const now = Date.now();
    const room: ChatRoom = {
      id: roomId, name, description, type,
      llmQueryName: type === "llm" ? (llmQueryName ?? "") : undefined,
      creatorId, createdAt: now, updatedAt: now,
    };
    console.log(`[YJS] Creating room: ${name} (${roomId}) type=${type}`);
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
      // Only public and llm rooms are discoverable via search
      if (r.type === "private") return;
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
    type: "public" | "private" | "llm",
    creatorId: string,
    creatorName: string,
    llmQueryName?: string,
  ): Promise<ChatRoom> {
    let room = await this.getRoomByName(name);
    if (!room) room = await this.createRoom(name, type, creatorId, creatorName, "", llmQueryName);
    if (!(await this.isMember(room.id, creatorId)))
      await this.joinRoom(room.id, creatorId, creatorName);
    return room;
  }

  // ── Membership ──────────────────────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    this.assert();
    const key = `${roomId}::${userId}`;
    if (this.membersMap!.has(key)) return true;
    console.log(`[YJS] User ${userName} (${userId}) joining room ${roomId}`);
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
    authorType: "user" | "assistant" = "user",
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
      authorType,
    };
    console.log(`[YJS] ${authorType === "assistant" ? "[AI]" : "[User]"} → room ${roomId}: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
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

  /**
   * Returns the conversation history for an LLM room in the standard
   * { role, content } format suitable for passing to AI APIs.
   * The system prompt (if any) is NOT prepended here — the hook layer adds it.
   */
  async getLlmConversationHistory(roomId: string): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
    const messages = await this.getMessages(roomId);
    return messages
      .filter((m) => m.authorId !== LLM_BOT_AUTHOR_ID || m.authorType === "assistant")
      .map((m) => ({
        role: (m.authorType === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: m.text,
      }));
  }

  // ── Typing (via Awareness — ephemeral, auto-clears on disconnect) ──────

  startTyping(roomId: string, userId: string, userName: string): void {
    this.wsProvider?.awareness.setLocalStateField("typing", { userId, userName, roomId });
  }

  stopTyping(_roomId: string, _userId: string): void {
    this.wsProvider?.awareness.setLocalStateField("typing", null);
  }

  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[] {
    if (!this.wsProvider) return [];
    const myClientId = this.wsProvider.awareness.clientID;
    const result: TypingUser[] = [];
    this.wsProvider.awareness.getStates().forEach((state, clientId) => {
      if (clientId === myClientId) return;
      const typing = state.typing as TypingUser | null | undefined;
      if (!typing) return;
      if (typing.roomId !== roomId) return;
      if (excludeUserId && typing.userId === excludeUserId) return;
      result.push(typing);
    });
    return result;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private assert(): void {
    if (!this.ready)
      throw new Error("ChatStore not initialized. Call init() first.");
  }
}
