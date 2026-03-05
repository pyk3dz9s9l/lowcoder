import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
} from "./store";
import { getChatStore, releaseChatStore } from "./store";
import type { ChatStore } from "./store";

export interface UseChatStoreConfig {
  applicationId: string;
  defaultRoom: string;
  userId: string;
  userName: string;
  wsUrl: string;
}

export interface UseChatStoreReturn {
  ready: boolean;
  error: string | null;
  connectionLabel: string;

  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  userRooms: ChatRoom[];
  currentRoomMembers: RoomMember[];
  typingUsers: TypingUser[];

  sendMessage: (text: string) => Promise<boolean>;
  switchRoom: (roomId: string) => Promise<void>;
  createRoom: (name: string, type: "public" | "private", description?: string) => Promise<ChatRoom | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  searchRooms: (query: string) => Promise<ChatRoom[]>;
  startTyping: () => void;
  stopTyping: () => void;
}

const TYPING_POLL_INTERVAL = 1500;

export function useChatStore(config: UseChatStoreConfig): UseChatStoreReturn {
  const { applicationId, defaultRoom, userId, userName, wsUrl } = config;

  const storeRef = useRef<ChatStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("Connecting...");

  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userRooms, setUserRooms] = useState<ChatRoom[]>([]);
  const [currentRoomMembers, setCurrentRoomMembers] = useState<RoomMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const activeRoomIdRef = useRef<string | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Granular refresh helpers ──────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    const store = storeRef.current;
    if (!store || !userId) return;
    try {
      const rooms = await store.getUserRooms(userId);
      setUserRooms(rooms);
    } catch { /* non-fatal */ }
  }, [userId]);

  const refreshMessages = useCallback(async () => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    try {
      const msgs = await store.getMessages(roomId);
      setMessages(msgs);
    } catch { /* non-fatal */ }
  }, []);

  const refreshMembers = useCallback(async () => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    try {
      const members = await store.getRoomMembers(roomId);
      setCurrentRoomMembers(members);
    } catch { /* non-fatal */ }
  }, []);

  const refreshTyping = useCallback(() => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    const users = store.getTypingUsers(roomId, userId);
    setTypingUsers(users);
    return users;
  }, [userId]);

  const refreshConnection = useCallback(() => {
    const store = storeRef.current;
    if (store) setConnectionLabel(store.getConnectionLabel());
  }, []);

  // ── Smart typing poll: only runs when someone is typing ───────────────

  const startTypingPoll = useCallback(() => {
    if (typingPollRef.current) return;
    typingPollRef.current = setInterval(() => {
      const users = refreshTyping();
      if (!users || users.length === 0) {
        if (typingPollRef.current) {
          clearInterval(typingPollRef.current);
          typingPollRef.current = null;
        }
      }
    }, TYPING_POLL_INTERVAL);
  }, [refreshTyping]);

  const stopTypingPoll = useCallback(() => {
    if (typingPollRef.current) {
      clearInterval(typingPollRef.current);
      typingPollRef.current = null;
    }
  }, []);

  // ── Handle granular store changes ─────────────────────────────────────

  const handleStoreChange = useCallback(
    (changes: Set<ChangeType>) => {
      if (changes.has("rooms") || changes.has("members")) refreshRooms();
      if (changes.has("messages")) refreshMessages();
      if (changes.has("members")) refreshMembers();
      if (changes.has("connection")) refreshConnection();
      if (changes.has("typing")) {
        const users = refreshTyping();
        if (users && users.length > 0) startTypingPoll();
      }
    },
    [refreshRooms, refreshMessages, refreshMembers, refreshConnection, refreshTyping, startTypingPoll],
  );

  // ── Initialization ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!applicationId || !userId || !userName) return;

    let cancelled = false;
    const store = getChatStore(applicationId, wsUrl);
    storeRef.current = store;

    (async () => {
      try {
        await store.init();
        if (cancelled) return;

        const room = await store.ensureRoom(defaultRoom, "public", userId, userName);
        if (cancelled) return;

        activeRoomIdRef.current = room.id;
        setCurrentRoom(room);

        const [msgs, rooms, members] = await Promise.all([
          store.getMessages(room.id),
          store.getUserRooms(userId),
          store.getRoomMembers(room.id),
        ]);
        if (cancelled) return;

        setMessages(msgs);
        setUserRooms(rooms);
        setCurrentRoomMembers(members);
        setConnectionLabel(store.getConnectionLabel());
        setReady(true);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to initialize chat store");
      }
    })();

    const unsub = store.subscribe((changes) => {
      if (!cancelled) handleStoreChange(changes);
    });

    return () => {
      cancelled = true;
      unsub();
      stopTypingPoll();
      releaseChatStore(applicationId);
    };
  }, [applicationId, userId, userName, defaultRoom, wsUrl, handleStoreChange, stopTypingPoll]);

  // ── Actions ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const store = storeRef.current;
      const roomId = activeRoomIdRef.current;
      if (!store || !roomId || !text.trim()) return false;
      try {
        await store.sendMessage(roomId, userId, userName, text.trim());
        return true;
      } catch {
        return false;
      }
    },
    [userId, userName],
  );

  const switchRoom = useCallback(async (roomId: string) => {
    const store = storeRef.current;
    if (!store) return;
    const room = await store.getRoom(roomId);
    if (!room) return;
    activeRoomIdRef.current = room.id;
    setCurrentRoom(room);
    const [msgs, members] = await Promise.all([
      store.getMessages(room.id),
      store.getRoomMembers(room.id),
    ]);
    setMessages(msgs);
    setCurrentRoomMembers(members);
  }, []);

  const createRoom = useCallback(
    async (name: string, type: "public" | "private", description?: string): Promise<ChatRoom | null> => {
      const store = storeRef.current;
      if (!store) return null;
      try {
        return await store.createRoom(name, type, userId, userName, description);
      } catch {
        return null;
      }
    },
    [userId, userName],
  );

  const joinRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      const store = storeRef.current;
      if (!store) return false;
      try {
        const ok = await store.joinRoom(roomId, userId, userName);
        if (ok) await switchRoom(roomId);
        return ok;
      } catch {
        return false;
      }
    },
    [userId, userName, switchRoom],
  );

  const leaveRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      const store = storeRef.current;
      if (!store) return false;
      try {
        const ok = await store.leaveRoom(roomId, userId);
        if (ok && activeRoomIdRef.current === roomId) {
          const rooms = await store.getUserRooms(userId);
          if (rooms.length > 0) {
            await switchRoom(rooms[0].id);
          } else {
            activeRoomIdRef.current = null;
            setCurrentRoom(null);
            setMessages([]);
            setCurrentRoomMembers([]);
          }
        }
        return ok;
      } catch {
        return false;
      }
    },
    [userId, switchRoom],
  );

  const searchRooms = useCallback(
    async (query: string): Promise<ChatRoom[]> => {
      const store = storeRef.current;
      if (!store || !query.trim()) return [];
      try {
        return await store.getSearchableRooms(userId, query.trim());
      } catch {
        return [];
      }
    },
    [userId],
  );

  const startTyping = useCallback(() => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    store.startTyping(roomId, userId, userName);
  }, [userId, userName]);

  const stopTyping = useCallback(() => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    store.stopTyping(roomId, userId);
  }, [userId]);

  return {
    ready,
    error,
    connectionLabel,
    currentRoom,
    messages,
    userRooms,
    currentRoomMembers,
    typingUsers,
    sendMessage,
    switchRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    searchRooms,
    startTyping,
    stopTyping,
  };
}
