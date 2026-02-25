import alasql from "alasql";

// ─── Types ───────────────────────────────────────────────────────────────────

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

export type ChatStoreListener = () => void;

// ─── Store ───────────────────────────────────────────────────────────────────

const CROSS_TAB_EVENT = "chatbox-v2-update";

/**
 * Thin wrapper around ALASql providing chat persistence.
 *
 * Design goals:
 *  - One class, zero abstraction layers.
 *  - Schema actually matches the data we need (rooms store type, description,
 *    etc.; messages store authorId/authorName; membership in its own table).
 *  - Synchronous-feel API (all methods are async because ALASql is, but there
 *    is no extra indirection).
 *  - Change listeners so React can subscribe without polling.
 */
export class ChatDataStore {
  private dbName: string;
  private ready = false;
  private listeners = new Set<ChatStoreListener>();

  constructor(applicationId: string) {
    this.dbName = `ChatV2_${applicationId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.ready) return;
    alasql.options.autocommit = true;

    await alasql.promise(`CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ${this.dbName}`);
    await alasql.promise(`ATTACH LOCALSTORAGE DATABASE ${this.dbName}`);
    await alasql.promise(`USE ${this.dbName}`);

    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS rooms (
        id STRING PRIMARY KEY,
        name STRING,
        description STRING,
        type STRING,
        creatorId STRING,
        createdAt NUMBER,
        updatedAt NUMBER
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS messages (
        id STRING PRIMARY KEY,
        roomId STRING,
        authorId STRING,
        authorName STRING,
        text STRING,
        timestamp NUMBER
      )
    `);
    await alasql.promise(`
      CREATE TABLE IF NOT EXISTS members (
        roomId STRING,
        userId STRING,
        userName STRING,
        joinedAt NUMBER
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

  // ── Subscriptions (React-friendly) ───────────────────────────────────────

  subscribe(listener: ChatStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(CROSS_TAB_EVENT));
      } catch {
        // CustomEvent not supported in test environments
      }
    }
  }

  private onCrossTabUpdate = () => {
    this.listeners.forEach((fn) => fn());
  };

  // ── Rooms ────────────────────────────────────────────────────────────────

  async createRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
    description = "",
  ): Promise<ChatRoom> {
    this.assertReady();
    const id = this.uid();
    const now = Date.now();
    await alasql.promise(
      `INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, type, creatorId, now, now],
    );
    await alasql.promise(
      `INSERT INTO members VALUES (?, ?, ?, ?)`,
      [id, creatorId, creatorName, now],
    );
    this.notify();
    return { id, name, description, type, creatorId, createdAt: now, updatedAt: now };
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    this.assertReady();
    const rows = (await alasql.promise(
      `SELECT * FROM rooms WHERE id = ?`,
      [roomId],
    )) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getRoomByName(name: string): Promise<ChatRoom | null> {
    this.assertReady();
    const rows = (await alasql.promise(
      `SELECT * FROM rooms WHERE name = ?`,
      [name],
    )) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getAllRooms(): Promise<ChatRoom[]> {
    this.assertReady();
    return (await alasql.promise(
      `SELECT * FROM rooms ORDER BY updatedAt DESC`,
    )) as ChatRoom[];
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    this.assertReady();
    return (await alasql.promise(
      `SELECT r.* FROM rooms r JOIN members m ON r.id = m.roomId WHERE m.userId = ? ORDER BY r.updatedAt DESC`,
      [userId],
    )) as ChatRoom[];
  }

  async getSearchableRooms(userId: string, query: string): Promise<ChatRoom[]> {
    this.assertReady();
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

  // ── Membership ───────────────────────────────────────────────────────────

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    this.assertReady();
    const existing = (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    )) as RoomMember[];
    if (existing.length > 0) return true; // already a member
    await alasql.promise(
      `INSERT INTO members VALUES (?, ?, ?, ?)`,
      [roomId, userId, userName, Date.now()],
    );
    this.notify();
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    this.assertReady();
    await alasql.promise(
      `DELETE FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    );
    this.notify();
    return true;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    this.assertReady();
    return (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? ORDER BY joinedAt ASC`,
      [roomId],
    )) as RoomMember[];
  }

  async isMember(roomId: string, userId: string): Promise<boolean> {
    this.assertReady();
    const rows = (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    )) as RoomMember[];
    return rows.length > 0;
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  async sendMessage(
    roomId: string,
    authorId: string,
    authorName: string,
    text: string,
  ): Promise<ChatMessage> {
    this.assertReady();
    const msg: ChatMessage = {
      id: this.uid(),
      roomId,
      authorId,
      authorName,
      text,
      timestamp: Date.now(),
    };
    await alasql.promise(
      `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)`,
      [msg.id, msg.roomId, msg.authorId, msg.authorName, msg.text, msg.timestamp],
    );
    await alasql.promise(
      `UPDATE rooms SET updatedAt = ? WHERE id = ?`,
      [msg.timestamp, roomId],
    );
    this.notify();
    return msg;
  }

  async getMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
    this.assertReady();
    const rows = (await alasql.promise(
      `SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC`,
      [roomId],
    )) as ChatMessage[];
    return rows.slice(-limit);
  }

  // ── Or-create helpers (for initial room setup) ───────────────────────────

  async ensureRoom(
    name: string,
    type: "public" | "private",
    creatorId: string,
    creatorName: string,
  ): Promise<ChatRoom> {
    let room = await this.getRoomByName(name);
    if (!room) {
      room = await this.createRoom(name, type, creatorId, creatorName);
    }
    const member = await this.isMember(room.id, creatorId);
    if (!member) {
      await this.joinRoom(room.id, creatorId, creatorName);
    }
    return room;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private assertReady(): void {
    if (!this.ready) throw new Error("ChatDataStore not initialized. Call init() first.");
  }

  private uid(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// Global cache keyed by applicationId so multiple components share one store.
const storeCache = new Map<string, ChatDataStore>();

export function getChatStore(applicationId: string): ChatDataStore {
  if (!storeCache.has(applicationId)) {
    storeCache.set(applicationId, new ChatDataStore(applicationId));
  }
  return storeCache.get(applicationId)!;
}
