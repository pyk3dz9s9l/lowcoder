import alasql from "alasql";
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

const CROSS_TAB_EVENT = "chatbox-v2-update";

export class LocalChatStore implements IChatStore {
  private dbName: string;
  private ready = false;
  private listeners = new Set<ChatStoreListener>();
  private typingMap = new Map<string, TypingUser>();

  constructor(applicationId: string) {
    this.dbName = `ChatV2_${applicationId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  }

  isReady(): boolean {
    return this.ready;
  }

  getConnectionLabel(): string {
    return this.ready ? "Local" : "Connecting...";
  }

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

  private notify(changes: Set<ChangeType>): void {
    this.listeners.forEach((fn) => fn(changes));
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(CROSS_TAB_EVENT));
      } catch { /* noop */ }
    }
  }

  private onCrossTabUpdate = () => {
    this.listeners.forEach((fn) =>
      fn(new Set(["rooms", "messages", "members"])),
    );
  };

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
    await alasql.promise(
      `INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roomId, name, description, type, creatorId, now, now],
    );
    await alasql.promise(
      `INSERT INTO members VALUES (?, ?, ?, ?)`,
      [roomId, creatorId, creatorName, now],
    );
    this.notify(new Set(["rooms", "members"]));
    return { id: roomId, name, description, type, creatorId, createdAt: now, updatedAt: now };
  }

  async getRoom(roomId: string): Promise<ChatRoom | null> {
    this.assert();
    const rows = (await alasql.promise(
      `SELECT * FROM rooms WHERE id = ?`,
      [roomId],
    )) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getRoomByName(name: string): Promise<ChatRoom | null> {
    this.assert();
    const rows = (await alasql.promise(
      `SELECT * FROM rooms WHERE name = ?`,
      [name],
    )) as ChatRoom[];
    return rows.length > 0 ? rows[0] : null;
  }

  async getAllRooms(): Promise<ChatRoom[]> {
    this.assert();
    return (await alasql.promise(
      `SELECT * FROM rooms ORDER BY updatedAt DESC`,
    )) as ChatRoom[];
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

  async joinRoom(roomId: string, userId: string, userName: string): Promise<boolean> {
    this.assert();
    const existing = (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    )) as RoomMember[];
    if (existing.length > 0) return true;
    await alasql.promise(
      `INSERT INTO members VALUES (?, ?, ?, ?)`,
      [roomId, userId, userName, Date.now()],
    );
    this.notify(new Set(["members"]));
    return true;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    await alasql.promise(
      `DELETE FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    );
    this.notify(new Set(["members"]));
    return true;
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    this.assert();
    return (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? ORDER BY joinedAt ASC`,
      [roomId],
    )) as RoomMember[];
  }

  async isMember(roomId: string, userId: string): Promise<boolean> {
    this.assert();
    const rows = (await alasql.promise(
      `SELECT * FROM members WHERE roomId = ? AND userId = ?`,
      [roomId, userId],
    )) as RoomMember[];
    return rows.length > 0;
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
    await alasql.promise(
      `INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)`,
      [msg.id, msg.roomId, msg.authorId, msg.authorName, msg.text, msg.timestamp],
    );
    await alasql.promise(
      `UPDATE rooms SET updatedAt = ? WHERE id = ?`,
      [msg.timestamp, roomId],
    );
    this.notify(new Set(["messages", "rooms"]));
    return msg;
  }

  async getMessages(roomId: string, limit = 100): Promise<ChatMessage[]> {
    this.assert();
    const rows = (await alasql.promise(
      `SELECT * FROM messages WHERE roomId = ? ORDER BY timestamp ASC`,
      [roomId],
    )) as ChatMessage[];
    return rows.slice(-limit);
  }

  // ── Typing ─────────────────────────────────────────────────────────────

  private typingKey(roomId: string, userId: string) {
    return `${roomId}::${userId}`;
  }

  startTyping(roomId: string, userId: string, userName: string): void {
    this.typingMap.set(this.typingKey(roomId, userId), {
      userId,
      userName,
      roomId,
      startedAt: Date.now(),
    });
    this.notify(new Set(["typing"]));
  }

  stopTyping(roomId: string, userId: string): void {
    if (this.typingMap.delete(this.typingKey(roomId, userId))) {
      this.notify(new Set(["typing"]));
    }
  }

  getTypingUsers(roomId: string, excludeUserId?: string): TypingUser[] {
    const now = Date.now();
    const result: TypingUser[] = [];
    let expired = false;
    for (const [key, entry] of this.typingMap) {
      if (entry.roomId !== roomId) continue;
      if (excludeUserId && entry.userId === excludeUserId) continue;
      if (now - entry.startedAt > 5000) {
        this.typingMap.delete(key);
        expired = true;
        continue;
      }
      result.push(entry);
    }
    if (expired) this.notify(new Set(["typing"]));
    return result;
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private assert(): void {
    if (!this.ready) throw new Error("LocalChatStore not initialized. Call init() first.");
  }
}
