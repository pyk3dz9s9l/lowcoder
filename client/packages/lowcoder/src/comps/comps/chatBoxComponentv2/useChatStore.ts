import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import {
  useStorage,
  useMyPresence,
  useOthers,
  useConnection,
  LLM_BOT_AUTHOR_ID,
  uid,
} from "./store";
import type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  RoomInvite,
  TypingUser,
} from "./store";

// ── Public interfaces ──────────────────────────────────────────────────────

export interface UseChatStoreConfig {
  userId: string;
  userName: string;
  dispatch?: (...args: any[]) => void;
  systemPrompt?: string;
  llmBotName?: string;
}

export interface PendingRoomInvite extends RoomInvite {
  roomName: string;
}

export interface UseChatStoreReturn {
  ready: boolean;
  error: string | null;
  connectionLabel: string;
  isLlmLoading: boolean;

  currentRoom: ChatRoom | null;
  messages: ChatMessage[];
  userRooms: ChatRoom[];
  currentRoomMembers: RoomMember[];
  typingUsers: TypingUser[];
  pendingInvites: PendingRoomInvite[];

  sendMessage: (text: string) => Promise<boolean>;
  switchRoom: (roomId: string) => void;
  createRoom: (
    name: string,
    type: "public" | "private" | "llm",
    description?: string,
    llmQueryName?: string,
  ) => Promise<ChatRoom | null>;
  joinRoom: (roomId: string) => boolean;
  leaveRoom: (roomId: string) => boolean;
  searchRooms: (query: string) => Promise<ChatRoom[]>;
  sendPrivateInvite: (toUserId: string, toUserName?: string) => Promise<boolean>;
  acceptInvite: (inviteId: string) => boolean;
  declineInvite: (inviteId: string) => boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

// ── LLM response extraction ───────────────────────────────────────────────

function extractAiText(result: any): string {
  if (!result) return "No response received.";
  if (typeof result === "string") return result;

  if (Array.isArray(result.choices) && result.choices.length > 0) {
    const choice = result.choices[0];
    if (choice?.message?.content) return String(choice.message.content);
    if (choice?.text) return String(choice.text);
  }
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0];
    if (first?.text) return String(first.text);
  }
  if (result.message && typeof result.message === "object" && result.message.content) {
    return String(result.message.content);
  }
  if (result.message && typeof result.message === "string") return result.message;
  if (result.content && typeof result.content === "string") return result.content;
  if (result.text && typeof result.text === "string") return result.text;
  if (result.response && typeof result.response === "string") return result.response;
  if (result.output && typeof result.output === "string") return result.output;
  if (result.answer && typeof result.answer === "string") return result.answer;
  if (result.reply && typeof result.reply === "string") return result.reply;

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useChatStore(config: UseChatStoreConfig): UseChatStoreReturn {
  const { userId, userName, dispatch, systemPrompt, llmBotName } = config;

  // ── Pluv storage hooks (reactive — re-render on change) ──────────────
  const [rooms, roomsYMap] = useStorage("rooms");
  const [members, membersYMap] = useStorage("members");
  const [allMessages, messagesYMap] = useStorage("messages");
  const [invites, invitesYMap] = useStorage("invites");

  // ── Pluv presence + connection ───────────────────────────────────────
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const connection = useConnection();

  // ── Local state ──────────────────────────────────────────────────────
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;

  // Keep refs in sync so callbacks see latest values
  const dispatchRef = useRef(dispatch);
  const systemPromptRef = useRef(systemPrompt);
  const llmBotNameRef = useRef(llmBotName);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { llmBotNameRef.current = llmBotName; }, [llmBotName]);

  // ── Derived state ────────────────────────────────────────────────────

  const ready = connection.state === "open" && rooms != null;

  const connectionLabel = useMemo(() => {
    if (connection.state === "open") return "Online";
    if (connection.state === "connecting") return "Connecting...";
    return "Offline";
  }, [connection.state]);

  const roomsRecord = rooms as Record<string, ChatRoom> | null;
  const membersRecord = members as Record<string, RoomMember> | null;
  const messagesRecord = allMessages as Record<string, ChatMessage> | null;
  const invitesRecord = invites as Record<string, RoomInvite> | null;

  const currentRoom = useMemo<ChatRoom | null>(() => {
    if (!activeRoomId || !roomsRecord) return null;
    return roomsRecord[activeRoomId] ?? null;
  }, [roomsRecord, activeRoomId]);

  const userRooms = useMemo<ChatRoom[]>(() => {
    if (!roomsRecord || !membersRecord) return [];
    const memberRoomIds = new Set<string>();
    for (const member of Object.values(membersRecord)) {
      if (member.userId === userId) memberRoomIds.add(member.roomId);
    }
    return Object.values(roomsRecord)
      .filter((r) => memberRoomIds.has(r.id))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [roomsRecord, membersRecord, userId]);

  const messages = useMemo<ChatMessage[]>(() => {
    if (!messagesRecord || !activeRoomId) return [];
    return Object.values(messagesRecord)
      .filter((m) => m.roomId === activeRoomId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messagesRecord, activeRoomId]);

  const currentRoomMembers = useMemo<RoomMember[]>(() => {
    if (!membersRecord || !activeRoomId) return [];
    return Object.values(membersRecord)
      .filter((m) => m.roomId === activeRoomId)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }, [membersRecord, activeRoomId]);

  const typingUsers = useMemo<TypingUser[]>(() => {
    if (!activeRoomId) return [];
    return others
      .filter((o) => {
        const t = (o.presence as any)?.typing;
        return t?.roomId === activeRoomId && t?.userId !== userId;
      })
      .map((o) => (o.presence as any).typing as TypingUser);
  }, [others, activeRoomId, userId]);

  const pendingInvites = useMemo<PendingRoomInvite[]>(() => {
    if (!invitesRecord || !roomsRecord) return [];
    return Object.values(invitesRecord)
      .filter((inv) => inv.toUserId === userId && inv.status === "pending")
      .map((inv) => {
        const room = roomsRecord[inv.roomId];
        if (!room || room.type !== "private") return null;
        return { ...inv, roomName: room.name };
      })
      .filter((v): v is PendingRoomInvite => v != null)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [invitesRecord, roomsRecord, userId]);

  // ── LLM query invocation ─────────────────────────────────────────────

  const invokeLlmQuery = useCallback(
    async (queryName: string, userText: string, roomId: string): Promise<string> => {
      const currentDispatch = dispatchRef.current;
      if (!currentDispatch) {
        return "(LLM error: no dispatch available)";
      }

      const rawHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
      if (messagesRecord) {
        const roomMsgs = Object.values(messagesRecord)
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => a.timestamp - b.timestamp);
        for (const m of roomMsgs) {
          rawHistory.push({
            role: m.authorType === "assistant" ? "assistant" : "user",
            content: m.text,
          });
        }
      }

      const sysPrompt = systemPromptRef.current?.trim();
      const conversationHistory = sysPrompt
        ? [{ role: "system" as const, content: sysPrompt }, ...rawHistory]
        : rawHistory;

      try {
        const result: any = await getPromiseAfterDispatch(
          currentDispatch,
          routeByNameAction(
            queryName,
            executeQueryAction({
              args: {
                prompt: { value: userText },
                message: { value: userText },
                conversationHistory: { value: conversationHistory },
                systemPrompt: { value: sysPrompt ?? "" },
                roomId: { value: roomId },
              },
            }),
          ),
        );
        return extractAiText(result);
      } catch (e: any) {
        console.error("[LLM] Query error:", e);
        throw new Error(e?.message || "LLM query failed");
      }
    },
    [messagesRecord],
  );

  // ── Actions ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const roomId = activeRoomIdRef.current;
      if (!messagesYMap || !roomsYMap || !roomId || !text.trim()) return false;

      try {
        const now = Date.now();
        const msg: ChatMessage = {
          id: uid(),
          roomId,
          authorId: userId,
          authorName: userName,
          text: text.trim(),
          timestamp: now,
          authorType: "user",
        };
        messagesYMap.set(msg.id, msg);

        const room = roomsYMap.get(roomId) as ChatRoom | undefined;
        if (room) {
          roomsYMap.set(roomId, { ...room, updatedAt: now });
        }

        if (room?.type === "llm" && room.llmQueryName) {
          setIsLlmLoading(true);
          try {
            const aiText = await invokeLlmQuery(room.llmQueryName, text.trim(), roomId);
            const botName = llmBotNameRef.current || "AI Assistant";
            const aiMsg: ChatMessage = {
              id: uid(),
              roomId,
              authorId: LLM_BOT_AUTHOR_ID,
              authorName: botName,
              text: aiText,
              timestamp: Date.now(),
              authorType: "assistant",
            };
            messagesYMap.set(aiMsg.id, aiMsg);
          } catch (e: any) {
            const botName = llmBotNameRef.current || "AI Assistant";
            const errMsg: ChatMessage = {
              id: uid(),
              roomId,
              authorId: LLM_BOT_AUTHOR_ID,
              authorName: botName,
              text: `Sorry, I encountered an error: ${e?.message || "unknown"}`,
              timestamp: Date.now(),
              authorType: "assistant",
            };
            messagesYMap.set(errMsg.id, errMsg);
          } finally {
            setIsLlmLoading(false);
          }
        }

        return true;
      } catch {
        return false;
      }
    },
    [messagesYMap, roomsYMap, userId, userName, invokeLlmQuery],
  );

  const switchRoom = useCallback(
    (roomId: string) => {
      if (!roomsRecord) return;
      const room = roomsRecord[roomId];
      if (!room) return;
      setActiveRoomId(roomId);
      setIsLlmLoading(false);
    },
    [roomsRecord],
  );

  const createRoom = useCallback(
    async (
      name: string,
      type: "public" | "private" | "llm",
      description?: string,
      llmQueryName?: string,
    ): Promise<ChatRoom | null> => {
      if (!roomsYMap || !membersYMap) return null;
      const roomId = uid();
      const now = Date.now();
      const room: ChatRoom = {
        id: roomId,
        name,
        description: description || "",
        type,
        llmQueryName: type === "llm" ? (llmQueryName ?? "") : undefined,
        creatorId: userId,
        createdAt: now,
        updatedAt: now,
      };
      roomsYMap.set(roomId, room);
      membersYMap.set(`${roomId}::${userId}`, {
        roomId,
        userId,
        userName,
        joinedAt: now,
      } as RoomMember);
      return room;
    },
    [roomsYMap, membersYMap, userId, userName],
  );

  const joinRoom = useCallback(
    (roomId: string): boolean => {
      if (!membersYMap) return false;
      const key = `${roomId}::${userId}`;
      if ((membersRecord ?? {})[key]) return true;
      membersYMap.set(key, {
        roomId,
        userId,
        userName,
        joinedAt: Date.now(),
      } as RoomMember);
      setActiveRoomId(roomId);
      return true;
    },
    [membersYMap, membersRecord, userId, userName],
  );

  const leaveRoom = useCallback(
    (roomId: string): boolean => {
      if (!membersYMap) return false;
      membersYMap.delete(`${roomId}::${userId}`);
      if (activeRoomIdRef.current === roomId) {
        const remaining = userRooms.filter((r) => r.id !== roomId);
        if (remaining.length > 0) {
          setActiveRoomId(remaining[0].id);
        } else {
          setActiveRoomId(null);
          setIsLlmLoading(false);
        }
      }
      return true;
    },
    [membersYMap, userId, userRooms],
  );

  const searchRooms = useCallback(
    async (query: string): Promise<ChatRoom[]> => {
      if (!roomsRecord || !membersRecord || !query.trim()) return [];
      const memberRoomIds = new Set<string>();
      for (const member of Object.values(membersRecord)) {
        if (member.userId === userId) memberRoomIds.add(member.roomId);
      }
      const lq = query.toLowerCase();
      return Object.values(roomsRecord)
        .filter((r) => {
          if (r.type === "private") return false;
          if (memberRoomIds.has(r.id)) return false;
          return (
            r.name.toLowerCase().includes(lq) ||
            r.description.toLowerCase().includes(lq)
          );
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [roomsRecord, membersRecord, userId],
  );

  const sendPrivateInvite = useCallback(
    async (toUserId: string, toUserName?: string): Promise<boolean> => {
      if (!invitesYMap || !membersRecord) return false;
      const room = activeRoomIdRef.current
        ? roomsRecord?.[activeRoomIdRef.current]
        : null;
      const targetId = toUserId.trim();
      if (!room || room.type !== "private" || !targetId) return false;
      if (targetId === userId) return false;

      if (membersRecord[`${room.id}::${targetId}`]) return false;

      if (invitesRecord) {
        for (const inv of Object.values(invitesRecord)) {
          if (inv.roomId === room.id && inv.toUserId === targetId && inv.status === "pending") {
            return true;
          }
        }
      }

      const invite: RoomInvite = {
        id: uid(),
        roomId: room.id,
        fromUserId: userId,
        fromUserName: userName,
        toUserId: targetId,
        toUserName: toUserName?.trim() || undefined,
        status: "pending",
        createdAt: Date.now(),
      };
      invitesYMap.set(invite.id, invite);
      return true;
    },
    [invitesYMap, invitesRecord, membersRecord, roomsRecord, userId, userName],
  );

  const acceptInvite = useCallback(
    (inviteId: string): boolean => {
      if (!invitesYMap || !membersYMap || !invitesRecord) return false;
      const current = invitesRecord[inviteId];
      if (!current || current.toUserId !== userId || current.status !== "pending") return false;
      if (!roomsRecord?.[current.roomId]) return false;

      membersYMap.set(`${current.roomId}::${userId}`, {
        roomId: current.roomId,
        userId,
        userName,
        joinedAt: Date.now(),
      } as RoomMember);
      invitesYMap.set(inviteId, {
        ...current,
        status: "accepted",
        respondedAt: Date.now(),
      } as RoomInvite);
      setActiveRoomId(current.roomId);
      return true;
    },
    [invitesYMap, membersYMap, invitesRecord, roomsRecord, userId, userName],
  );

  const declineInvite = useCallback(
    (inviteId: string): boolean => {
      if (!invitesYMap || !invitesRecord) return false;
      const current = invitesRecord[inviteId];
      if (!current || current.toUserId !== userId || current.status !== "pending") return false;
      invitesYMap.set(inviteId, {
        ...current,
        status: "declined",
        respondedAt: Date.now(),
      } as RoomInvite);
      return true;
    },
    [invitesYMap, invitesRecord, userId],
  );

  const startTyping = useCallback(() => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    updateMyPresence({ typing: { userId, userName, roomId } });
  }, [updateMyPresence, userId, userName]);

  const stopTyping = useCallback(() => {
    updateMyPresence({ typing: null });
  }, [updateMyPresence]);

  return {
    ready,
    error,
    connectionLabel,
    isLlmLoading,
    currentRoom,
    messages,
    userRooms,
    currentRoomMembers,
    typingUsers,
    pendingInvites,
    sendMessage,
    switchRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    searchRooms,
    sendPrivateInvite,
    acceptInvite,
    declineInvite,
    startTyping,
    stopTyping,
  };
}
