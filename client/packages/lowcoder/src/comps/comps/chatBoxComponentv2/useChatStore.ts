import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatDataStore, ChatMessage, ChatRoom, RoomMember, getChatStore } from "./chatDataStore";

export interface UseChatStoreConfig {
  applicationId: string;
  defaultRoom: string;
  userId: string;
  userName: string;
}

export interface UseChatStoreReturn {
  ready: boolean;
  error: string | null;

  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  userRooms: ChatRoom[];
  currentRoomMembers: RoomMember[];

  sendMessage: (text: string) => Promise<boolean>;
  switchRoom: (roomId: string) => Promise<void>;
  createRoom: (name: string, type: "public" | "private", description?: string) => Promise<ChatRoom | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  searchRooms: (query: string) => Promise<ChatRoom[]>;
}

export function useChatStore(config: UseChatStoreConfig): UseChatStoreReturn {
  const { applicationId, defaultRoom, userId, userName } = config;

  const storeRef = useRef<ChatDataStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userRooms, setUserRooms] = useState<ChatRoom[]>([]);
  const [currentRoomMembers, setCurrentRoomMembers] = useState<RoomMember[]>([]);

  // Track the "active room id" in a ref so callbacks always see the latest value.
  const activeRoomIdRef = useRef<string | null>(null);

  // ── Refresh helpers ────────────────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    const store = storeRef.current;
    if (!store || !userId) return;
    try {
      const rooms = await store.getUserRooms(userId);
      setUserRooms(rooms);
    } catch {
      // non-fatal
    }
  }, [userId]);

  const refreshMessages = useCallback(async () => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    try {
      const msgs = await store.getMessages(roomId);
      setMessages(msgs);
    } catch {
      // non-fatal
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    const store = storeRef.current;
    const roomId = activeRoomIdRef.current;
    if (!store || !roomId) return;
    try {
      const members = await store.getRoomMembers(roomId);
      setCurrentRoomMembers(members);
    } catch {
      // non-fatal
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshRooms(), refreshMessages(), refreshMembers()]);
  }, [refreshRooms, refreshMessages, refreshMembers]);

  // ── Initialization ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!applicationId || !userId || !userName) return;

    let cancelled = false;
    const store = getChatStore(applicationId);
    storeRef.current = store;

    (async () => {
      try {
        await store.init();
        if (cancelled) return;

        // Ensure the default room exists and user is a member.
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
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to initialize chat store");
      }
    })();

    const unsub = store.subscribe(() => {
      if (!cancelled) refreshAll();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [applicationId, userId, userName, defaultRoom, refreshAll]);

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

  const switchRoom = useCallback(
    async (roomId: string) => {
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
    },
    [],
  );

  const createRoom = useCallback(
    async (name: string, type: "public" | "private", description?: string): Promise<ChatRoom | null> => {
      const store = storeRef.current;
      if (!store) return null;
      try {
        const room = await store.createRoom(name, type, userId, userName, description);
        return room;
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

  return {
    ready,
    error,
    currentRoom,
    messages,
    userRooms,
    currentRoomMembers,
    sendMessage,
    switchRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    searchRooms,
  };
}
