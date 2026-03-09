import { useCallback, useEffect, useRef, useState } from "react";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
} from "./store";
import { getChatStore, releaseChatStore, LLM_BOT_AUTHOR_ID } from "./store";
import type { ChatStore } from "./store";

export interface UseChatStoreConfig {
  applicationId: string;
  userId: string;
  userName: string;
  wsUrl: string;
  /** Lowcoder component dispatch — required for firing LLM queries. */
  dispatch?: (...args: any[]) => void;
  /** System prompt prepended to conversation history passed to the query. */
  systemPrompt?: string;
  /** Display name for AI-generated messages. */
  llmBotName?: string;
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

  sendMessage: (text: string) => Promise<boolean>;
  switchRoom: (roomId: string) => Promise<void>;
  createRoom: (
    name: string,
    type: "public" | "private" | "llm",
    description?: string,
    llmQueryName?: string,
  ) => Promise<ChatRoom | null>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: (roomId: string) => Promise<boolean>;
  searchRooms: (query: string) => Promise<ChatRoom[]>;
  startTyping: () => void;
  stopTyping: () => void;
}

// ── Response extraction ────────────────────────────────────────────────────

/**
 * Pulls a text string out of whatever the Lowcoder query returned.
 *
 * Supported shapes (checked in priority order):
 *   OpenAI / Ollama-compatible : result.choices[0].message.content
 *   Ollama /api/chat           : result.message.content
 *   Anthropic                  : result.content[0].text
 *   Simple object              : result.content | result.text | result.response | result.output
 *   chatComp style             : result.message  (string)
 *   Plain string               : result
 */
function extractAiText(result: any): string {
  if (!result) return "No response received.";
  if (typeof result === "string") return result;

  // OpenAI / Ollama OpenAI-compat / LM Studio → choices[0].message.content
  if (Array.isArray(result.choices) && result.choices.length > 0) {
    const choice = result.choices[0];
    if (choice?.message?.content) return String(choice.message.content);
    if (choice?.text) return String(choice.text);
  }

  // Anthropic → content[0].text
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0];
    if (first?.text) return String(first.text);
  }

  // Ollama /api/chat native format → message.content
  if (result.message && typeof result.message === "object" && result.message.content) {
    return String(result.message.content);
  }
  if (result.message && typeof result.message === "string") return result.message;

  // Simple flat shapes (custom APIs, N8N, etc.)
  if (result.content && typeof result.content === "string") return result.content;
  if (result.text && typeof result.text === "string") return result.text;
  if (result.response && typeof result.response === "string") return result.response;
  if (result.output && typeof result.output === "string") return result.output;
  if (result.answer && typeof result.answer === "string") return result.answer;
  if (result.reply && typeof result.reply === "string") return result.reply;

  // Fallback — pretty-print whatever came back
  try { return JSON.stringify(result, null, 2); } catch { return String(result); }
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useChatStore(config: UseChatStoreConfig): UseChatStoreReturn {
  const { applicationId, userId, userName, wsUrl, dispatch, systemPrompt, llmBotName } = config;

  const storeRef = useRef<ChatStore | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("Connecting...");
  const [isLlmLoading, setIsLlmLoading] = useState(false);

  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userRooms, setUserRooms] = useState<ChatRoom[]>([]);
  const [currentRoomMembers, setCurrentRoomMembers] = useState<RoomMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const activeRoomIdRef = useRef<string | null>(null);
  const currentRoomRef = useRef<ChatRoom | null>(null);

  // Keep refs in sync so callbacks always see latest values without
  // needing to be in dependency arrays.
  const dispatchRef = useRef(dispatch);
  const systemPromptRef = useRef(systemPrompt);
  const llmBotNameRef = useRef(llmBotName);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { llmBotNameRef.current = llmBotName; }, [llmBotName]);

  // ── Granular refresh helpers ────────────────────────────────────────────

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
  }, [userId]);

  const refreshConnection = useCallback(() => {
    const store = storeRef.current;
    if (store) setConnectionLabel(store.getConnectionLabel());
  }, []);

  const handleStoreChange = useCallback(
    (changes: Set<ChangeType>) => {
      if (changes.has("rooms") || changes.has("members")) refreshRooms();
      if (changes.has("messages")) refreshMessages();
      if (changes.has("members")) refreshMembers();
      if (changes.has("connection")) refreshConnection();
      if (changes.has("typing")) refreshTyping();
    },
    [refreshRooms, refreshMessages, refreshMembers, refreshConnection, refreshTyping],
  );

  // ── Initialization ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!applicationId || !userId || !userName) return;

    let cancelled = false;
    const store = getChatStore(applicationId, wsUrl);
    storeRef.current = store;

    (async () => {
      try {
        await store.init();
        if (cancelled) return;

        const rooms = await store.getUserRooms(userId);
        if (cancelled) return;

        setUserRooms(rooms);
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
      releaseChatStore(applicationId);
    };
  }, [applicationId, userId, userName, wsUrl, handleStoreChange]);

  // ── LLM query invocation ─────────────────────────────────────────────────

  /**
   * Fires the configured Lowcoder query for the current LLM room, passing:
   *   - prompt / message  : the user's text (backward compat)
   *   - conversationHistory : [{role, content}] array for AI APIs
   *   - systemPrompt      : the configured system prompt
   *   - roomId            : so the query can segment by room if needed
   */
  const invokeLlmQuery = useCallback(
    async (queryName: string, userText: string, roomId: string): Promise<string> => {
      const store = storeRef.current;
      const currentDispatch = dispatchRef.current;

      if (!currentDispatch) {
        return "(LLM error: no dispatch available. Is the component configured?)";
      }

      // Build history before the message we just sent (inclusive of it)
      const rawHistory = store ? await store.getLlmConversationHistory(roomId) : [];

      // Prepend system prompt if configured
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
    [],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Sends a user message. If the active room is an LLM room the sender's
   * client also fires the configured query and writes the AI response to YJS,
   * which syncs to all connected members automatically.
   */
  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const store = storeRef.current;
      const roomId = activeRoomIdRef.current;
      const room = currentRoomRef.current;
      if (!store || !roomId || !text.trim()) return false;

      try {
        // 1. Write user message (visible to everyone immediately via YJS)
        await store.sendMessage(roomId, userId, userName, text.trim(), "user");

        // 2. If LLM room — fire query and write AI response
        if (room?.type === "llm" && room.llmQueryName) {
          setIsLlmLoading(true);
          try {
            const aiText = await invokeLlmQuery(room.llmQueryName, text.trim(), roomId);
            const botName = llmBotNameRef.current || "AI Assistant";
            await store.sendMessage(roomId, LLM_BOT_AUTHOR_ID, botName, aiText, "assistant");
          } catch (e: any) {
            const botName = llmBotNameRef.current || "AI Assistant";
            await store.sendMessage(
              roomId,
              LLM_BOT_AUTHOR_ID,
              botName,
              `Sorry, I encountered an error: ${e?.message || "unknown"}`,
              "assistant",
            );
          } finally {
            setIsLlmLoading(false);
          }
        }

        return true;
      } catch {
        return false;
      }
    },
    [userId, userName, invokeLlmQuery],
  );

  const switchRoom = useCallback(async (roomId: string) => {
    const store = storeRef.current;
    if (!store) return;
    const room = await store.getRoom(roomId);
    if (!room) return;
    activeRoomIdRef.current = room.id;
    currentRoomRef.current = room;
    setCurrentRoom(room);
    const [msgs, members] = await Promise.all([
      store.getMessages(room.id),
      store.getRoomMembers(room.id),
    ]);
    setMessages(msgs);
    setCurrentRoomMembers(members);
    setIsLlmLoading(false);
  }, []);

  const createRoom = useCallback(
    async (
      name: string,
      type: "public" | "private" | "llm",
      description?: string,
      llmQueryName?: string,
    ): Promise<ChatRoom | null> => {
      const store = storeRef.current;
      if (!store) return null;
      try {
        return await store.createRoom(name, type, userId, userName, description, llmQueryName);
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
            currentRoomRef.current = null;
            setCurrentRoom(null);
            setMessages([]);
            setCurrentRoomMembers([]);
            setIsLlmLoading(false);
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
    isLlmLoading,
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
