import alasql from "alasql";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

// ─── Shared types ────────────────────────────────────────────────────────────

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

export type ChatStoreListener = () => void;

export type SyncMode = "local" | "collaborative" | "hybrid";

/**
 * Common interface that both ALASql (local) and Yjs (collaborative) stores
 * implement. The hook delegates to whichever is active.
 */
export interface IChatStore {
  init(): Promise<void>;
  destroy(): void;
  subscribe(listener: ChatStoreListener): () => void;
  isReady(): boolean;
  getConnectionLabel(): string;

  createRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string, description?: string): Promise<ChatRoom>;
  getRoom(roomId: string): Promise<ChatRoom | null>;
  getRoomByName(name: string): Promise<ChatRoom | null>;
  getAllRooms(): Promise<ChatRoom[]>;
  getUserRooms(userId: string): Promise<ChatRoom[]>;
  getSearchableRooms(userId: string, query: string): Promise<ChatRoom[]>;
  ensureRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string): Promise<ChatRoom>;

  joinRoom(roomId: string, userId: string, userName: string): Promise<boolean>;
  leaveRoom(roomId: string, userId: string): Promise<boolean>;
  getRoomMembers(roomId: string): Promise<RoomMember[]>;
  isMember(roomId: string, userId: string): Promise<boolean>;

  sendMessage(roomId: string, authorId: string, authorName: string, text: string): Promise<ChatMessage>;
  getMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;

  startTyping(roomId: string, userId: string, userName: string): void;
  stopTyping(roomId: string, userId: string): void;
  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[];
}

// ─── ALASql local store ──────────────────────────────────────────────────────

const CROSS_TAB_EVENT = "chatbox-v2-update";

export class LocalChatStore implements IChatStore {
  private dbName: string;
  private ready = false;
  private listeners = new Set<ChatStoreListener>();
  private typingMap = new Map<string, TypingUser>();

  constructor(applicationId: string) {
    this.dbName = `ChatV2_${applicationId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  }

  isReady(): boolean { return this.ready; }
  getConnectionLabel(): string { return this.ready ? "Local" : "Connecting..."; }

  async init(): Promise<void> {
    if (this.ready) return;
    alasql.options.autocommit = true;

    await alasql.promise(`CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ${this.dbName}`);
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
    this.ready = true;

    if (typeof window !== "undefined") {
      window.addEventListener(CROSS_TAB_EVENT, this.onCrossTabUpdate);
    }
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener(CROSS_TAB_EVENT, this.onCrossTabUpdate);
    }
    this.listeners.clear();
  }

  subscribe(listener: ChatStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent(CROSS_TAB_EVENT)); } catch { /* noop */ }
    }
  }

  private onCrossTabUpdate = () => {
    this.listeners.forEach((fn) => fn());
  };

  // ── Rooms ──────────────────────────────────────────────────────────────

  async createRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string, description = ""): Promise<ChatRoom> {
    this.assert();
    const id = uid();
    const now = Date.now();
    await alasql.promise(`INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, name, description, type, creatorId, now, now]);
    await alasql.promise(`INSERT INTO members VALUES (?, ?, ?, ?)`, [id, creatorId, creatorName, now]);
    this.notify();
    return { id, name, description, type, creatorId, createdAt: now, updatedAt: now };
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    this.assert();
    const rows = (await alasql.promise(`SELECT * FROM rooms WHERE id = ?`, [roomId])) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getRoomByName(name: string): Promise<ChatRoom | null> {
    this.assert();
    const rows = (await alasql.promise(`SELECT * FROM rooms WHERE name = ?`, [name])) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getAllRooms(): Promise<ChatRoom[]> {
    this.assert();
    return (await alasql.promise(`SELECT * FROM rooms ORDER BY updatedAt DESC`)) as ChatRoom[];
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    this.assert();
    return (await alasql.promise(
      `SELECT r.* FROM rooms r JOIN members m ON r.id = m.roomId WHERE m.userId = ? ORDER BY r.updatedAt DESC`,
      [userId],
    )) as ChatRoom[];
  }

  async getSearchableRooms(userId: string, query: string): Promise<ChatRoom[]> {
    this.assert();
    const q = `%${query}%`;
    return (await alasql.promise(
      `SELECT DISTINCT r.* FROM rooms r
       WHERE r.type = 'public'
         AND r.id NOT IN (SELECT roomId FROM members WHERE userId = ?)
         AND (r.name LIKE ? OR r.description LIKE ?)
       ORDER BY r.updatedAt DESC`,
      [userId, q, q],
    )) as ChatRoom[];
  }

  async ensureRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string): Promise<ChatRoom> {
    let room = await this.getRoomByName(name);
    if (!room) room = await this.createRoom(name, type, creatorId, creatorName);
    if (!(await this.isMember(room.id, creatorId))) await this.joinRoom(room.id, creatorId, creatorName);
    return room;
  }

  // ── Membership ─────────────────────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    this.assert();
    const existing = (await alasql.promise(`SELECT * FROM members WHERE roomId = ? AND userId = ?`, [roomId, userId])) as RoomMember[];
    if (existing.length > 0) return true;
    await alasql.promise(`INSERT INTO members VALUES (?, ?, ?, ?)`, [roomId, userId, userName, Date.now()]);
    this.notify();
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    await alasql.promise(`DELETE FROM members WHERE roomId = ? AND userId = ?`, [roomId, userId]);
    this.notify();
    return true;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    this.assert();
    return (await alasql.promise(`SELECT * FROM members WHERE roomId = ? ORDER BY joinedAt ASC`, [roomId])) as RoomMember[];
  }

  async isMember(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    const rows = (await alasql.promise(`SELECT * FROM members WHERE roomId = ? AND userId = ?`, [roomId, userId])) as RoomMember[];
    return rows.length > 0;
  }

  // ── Messages ───────────────────────────────────────────────────────────

  async sendMessage(roomId: string, authorId: string, authorName: string, text: string): Promise<ChatMessage> {
    this.assert();
    const msg: ChatMessage = { id: uid(), roomId, authorId, authorName, text, timestamp: Date.now() };
    await alasql.promise(`INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)`, [msg.id, msg.roomId, msg.authorId, msg.authorName, msg.text, msg.timestamp]);
    await alasql.promise(`UPDATE rooms SET updatedAt = ? WHERE id = ?`, [msg.timestamp, roomId]);
    this.notify();
    return msg;
  }

  async getMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
    this.assert();
    const rows = (await alasql.promise(`SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC`, [roomId])) as ChatMessage[];
    return rows.slice(-limit);
  }

  // ── Typing ─────────────────────────────────────────────────────────────

  private typingKey(roomId: string, userId: string) { return `${roomId}::${userId}`; }

  startTyping(roomId: string, userId: string, userName: string): void {
    this.typingMap.set(this.typingKey(roomId, userId), { userId, userName, roomId, startedAt: Date.now() });
    this.notify();
  }

  stopTyping(roomId: string, userId: string): void {
    if (this.typingMap.delete(this.typingKey(roomId, userId))) {
      this.notify();
    }
  }

  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[] {
    const now = Date.now();
    const result: TypingUser[] = [];
    for (const [key, entry] of this.typingMap) {
      if (entry.roomId !== roomId) continue;
      if (excludeUserId && entry.userId === excludeUserId) continue;
      if (now - entry.startedAt > 5000) {
        this.typingMap.delete(key);
        continue;
      }
      result.push(entry);
    }
    return result;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private assert(): void {
    if (!this.ready) throw new Error("LocalChatStore not initialized. Call init() first.");
  }
}

// ─── Yjs collaborative store ────────────────────────────────────────────────

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

  // Shared doc/provider cache so multiple components on same page reuse the connection.
  private static docs = new Map<string, Y.Doc>();
  private static providers = new Map<string, WebsocketProvider>();
  private static refCounts = new Map<string, number>();

  constructor(applicationId: string, wsUrl: string) {
    this.applicationId = applicationId;
    this.wsUrl = wsUrl;
  }

  isReady(): boolean { return this.ready; }
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

    // React to any Yjs mutation → notify listeners
    const onChange = () => this.notify();
    this.messagesMap.observe(onChange);
    this.roomsMap.observe(onChange);
    this.membersMap.observe(onChange);
    this.typingYMap.observe(onChange);

    if (wsProvider) {
      wsProvider.on("status", (e: { status: string }) => {
        this.wsConnected = e.status === "connected";
        this.notify();
      });
      this.wsConnected = wsProvider.wsconnected;
    }

    this.ready = true;
    this.notify();
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

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ── Rooms ──────────────────────────────────────────────────────────────

  async createRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string, description = ""): Promise<ChatRoom> {
    this.assert();
    const id = uid();
    const now = Date.now();
    const room: ChatRoom = { id, name, description, type, creatorId, createdAt: now, updatedAt: now };
    this.roomsMap!.set(id, room);
    // Also add creator as member
    this.addMemberEntry(id, creatorId, creatorName, now);
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
    this.membersMap!.forEach((v: any, key: string) => {
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

  async ensureRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string): Promise<ChatRoom> {
    let room = await this.getRoomByName(name);
    if (!room) room = await this.createRoom(name, type, creatorId, creatorName);
    if (!(await this.isMember(room.id, creatorId))) await this.joinRoom(room.id, creatorId, creatorName);
    return room;
  }

  // ── Membership ─────────────────────────────────────────────────────────

  private memberKey(roomId: string, userId: string) { return `${roomId}::${userId}`; }

  private addMemberEntry(roomId: string, userId: string, userName: string, joinedAt: number) {
    this.membersMap!.set(this.memberKey(roomId, userId), { roomId, userId, userName, joinedAt } as RoomMember);
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

  async sendMessage(roomId: string, authorId: string, authorName: string, text: string): Promise<ChatMessage> {
    this.assert();
    const msg: ChatMessage = { id: uid(), roomId, authorId, authorName, text, timestamp: Date.now() };
    this.messagesMap!.set(msg.id, msg);
    // Touch room updatedAt
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

  private typingKey(roomId: string, userId: string) { return `${roomId}::${userId}`; }

  startTyping(roomId: string, userId: string, userName: string): void {
    this.typingYMap?.set(this.typingKey(roomId, userId), { userId, userName, roomId, startedAt: Date.now() } as TypingUser);
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

// ─── Hybrid store (local + Yjs with fallback) ───────────────────────────────

/**
 * Wraps both a LocalChatStore and a YjsChatStore. Writes go to both;
 * reads prefer Yjs when the WebSocket is connected, otherwise fall back to
 * local. This gives offline-capable persistence with real-time sync when
 * the server is reachable.
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

  isReady(): boolean { return this.ready; }
  getConnectionLabel(): string {
    if (!this.ready) return "Connecting...";
    const yjsLabel = this.yjs.getConnectionLabel();
    return `Hybrid (${yjsLabel})`;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    // Local always succeeds; Yjs may fail (no server) but we don't block on it.
    await this.local.init();
    try { await this.yjs.init(); } catch { /* yjs offline, that's fine */ }
    this.ready = true;

    this.local.subscribe(() => this.notify());
    this.yjs.subscribe(() => this.notify());
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

  private notify(): void { this.listeners.forEach((fn) => fn()); }

  // Prefer Yjs for reads when it's ready, fallback to local.
  private get reader(): IChatStore { return this.yjs.isReady() ? this.yjs : this.local; }

  // ── Rooms (write to both, read from best available) ────────────────────

  async createRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string, description?: string): Promise<ChatRoom> {
    const room = await this.local.createRoom(name, type, creatorId, creatorName, description);
    if (this.yjs.isReady()) {
      try { await this.yjs.createRoom(name, type, creatorId, creatorName, description); } catch { /* offline */ }
    }
    return room;
  }

  async getRoom(roomId: string) { return this.reader.getRoom(roomId); }
  async getRoomByName(name: string) { return this.reader.getRoomByName(name); }
  async getAllRooms() { return this.reader.getAllRooms(); }
  async getUserRooms(userId: string) { return this.reader.getUserRooms(userId); }
  async getSearchableRooms(userId: string, query: string) { return this.reader.getSearchableRooms(userId, query); }

  async ensureRoom(name: string, type: "public" | "private", creatorId: string, creatorName: string): Promise<ChatRoom> {
    const room = await this.local.ensureRoom(name, type, creatorId, creatorName);
    if (this.yjs.isReady()) {
      try { await this.yjs.ensureRoom(name, type, creatorId, creatorName); } catch { /* offline */ }
    }
    return room;
  }

  // ── Membership (write to both) ─────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    const ok = await this.local.joinRoom(roomId, userId, userName);
    if (this.yjs.isReady()) { try { await this.yjs.joinRoom(roomId, userId, userName); } catch { /* offline */ } }
    return ok;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const ok = await this.local.leaveRoom(roomId, userId);
    if (this.yjs.isReady()) { try { await this.yjs.leaveRoom(roomId, userId); } catch { /* offline */ } }
    return ok;
  }

  async getRoomMembers(roomId: string) { return this.reader.getRoomMembers(roomId); }
  async isMember(roomId: string, userId: string) { return this.reader.isMember(roomId, userId); }

  // ── Messages (write to both, read from best) ──────────────────────────

  async sendMessage(roomId: string, authorId: string, authorName: string, text: string): Promise<ChatMessage> {
    const msg = await this.local.sendMessage(roomId, authorId, authorName, text);
    if (this.yjs.isReady()) {
      try { await this.yjs.sendMessage(roomId, authorId, authorName, text); } catch { /* offline */ }
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

// ─── Helpers & cache ─────────────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

const storeCache = new Map<string, IChatStore>();

export function getChatStore(
  applicationId: string,
  mode: SyncMode = "local",
  wsUrl = "ws://localhost:3005",
): IChatStore {
  const key = `${applicationId}__${mode}`;
  if (!storeCache.has(key)) {
    let store: IChatStore;
    switch (mode) {
      case "collaborative":
        store = new YjsChatStore(applicationId, wsUrl);
        break;
      case "hybrid":
        store = new HybridChatStore(applicationId, wsUrl);
        break;
      default:
        store = new LocalChatStore(applicationId);
    }
    storeCache.set(key, store);
  }
  return storeCache.get(key)!;
}
