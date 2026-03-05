export type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
  ChatStoreListener,
  SyncMode,
  IChatStore,
} from "./types";
export { uid } from "./types";
export { LocalChatStore } from "./LocalChatStore";
export { YjsChatStore } from "./YjsChatStore";
export { HybridChatStore } from "./HybridChatStore";

import type { IChatStore, SyncMode } from "./types";
import { LocalChatStore } from "./LocalChatStore";
import { YjsChatStore } from "./YjsChatStore";
import { HybridChatStore } from "./HybridChatStore";

// ─── Factory with reference-counted cache ────────────────────────────────────

interface CacheEntry {
  store: IChatStore;
  refCount: number;
}

const storeCache = new Map<string, CacheEntry>();

function cacheKey(applicationId: string, mode: SyncMode): string {
  return `${applicationId}__${mode}`;
}

/**
 * Returns (or creates) a store for the given application/mode pair and
 * increments its reference count. Callers MUST call `releaseChatStore`
 * when they no longer need the store.
 */
export function getChatStore(
  applicationId: string,
  mode: SyncMode = "local",
  wsUrl = "ws://localhost:3005",
): IChatStore {
  const key = cacheKey(applicationId, mode);
  const entry = storeCache.get(key);
  if (entry) {
    entry.refCount++;
    return entry.store;
  }

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
  storeCache.set(key, { store, refCount: 1 });
  return store;
}

/**
 * Decrements the reference count for the given store key. When the count
 * reaches zero the store is destroyed and evicted from the cache.
 */
export function releaseChatStore(
  applicationId: string,
  mode: SyncMode = "local",
): void {
  const key = cacheKey(applicationId, mode);
  const entry = storeCache.get(key);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.store.destroy();
    storeCache.delete(key);
  }
}
