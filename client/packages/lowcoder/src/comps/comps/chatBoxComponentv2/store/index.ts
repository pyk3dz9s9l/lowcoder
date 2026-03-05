export type {
  ChatMessage,
  ChatRoom,
  RoomMember,
  TypingUser,
  ChangeType,
  ChatStoreListener,
} from "./types";
export { uid } from "./types";
export { ChatStore } from "./ChatStore";

import { ChatStore } from "./ChatStore";

// ─── Reference-counted singleton cache ───────────────────────────────────────

interface CacheEntry {
  store: ChatStore;
  refCount: number;
}

const storeCache = new Map<string, CacheEntry>();

export function getChatStore(
  applicationId: string,
  wsUrl = "ws://localhost:3005",
): ChatStore {
  const entry = storeCache.get(applicationId);
  if (entry) {
    entry.refCount++;
    return entry.store;
  }

  const store = new ChatStore(applicationId, wsUrl);
  storeCache.set(applicationId, { store, refCount: 1 });
  return store;
}

export function releaseChatStore(applicationId: string): void {
  const entry = storeCache.get(applicationId);
  if (!entry) return;

  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.store.destroy();
    storeCache.delete(applicationId);
  }
}
