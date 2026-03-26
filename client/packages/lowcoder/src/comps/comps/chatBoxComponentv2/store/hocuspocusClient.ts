import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Y from "yjs";
import {
  HocuspocusProvider,
  WebSocketStatus,
} from "@hocuspocus/provider";

// ── Environment config ───────────────────────────────────────────────────────

const WS_URL: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_HOCUSPOCUS_URL) ||
  (typeof globalThis !== "undefined" &&
    (globalThis as any).__HOCUSPOCUS_URL__) ||
  "ws://localhost:3006";

const AUTH_TOKEN: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_HOCUSPOCUS_SECRET) ||
  "";

type ConnectionState = "connecting" | "open" | "closed";

function mapWebSocketStatus(status?: string): ConnectionState {
  if (status === WebSocketStatus.Connected) {
    return "open";
  }

  if (status === WebSocketStatus.Connecting) {
    return "connecting";
  }

  return "closed";
}

// ── Context ──────────────────────────────────────────────────────────────────

interface HocuspocusContextValue {
  provider: HocuspocusProvider;
  doc: Y.Doc;
}

const HocuspocusContext = createContext<HocuspocusContextValue | null>(null);

function useHocuspocusContext(): HocuspocusContextValue {
  const ctx = useContext(HocuspocusContext);
  if (!ctx) {
    throw new Error(
      "Hocuspocus hooks must be used inside <HocuspocusRoomProvider>",
    );
  }
  return ctx;
}

// ── Provider component ───────────────────────────────────────────────────────

interface HocuspocusRoomProviderProps {
  /** Document/room name — all clients with the same name share state. */
  room: string;
  /** Initial presence fields to set on connect. */
  initialPresence?: Record<string, any>;
  /** Called when auth fails. */
  onAuthenticationFailed?: (error: any) => void;
  children: React.ReactNode;
}

function HocuspocusRoomProviderInner({
  room,
  initialPresence,
  onAuthenticationFailed,
  children,
}: HocuspocusRoomProviderProps) {
  const stableInitialPresence = useMemo(() => initialPresence ?? null, [
    JSON.stringify(initialPresence ?? null),
  ]);

  const value = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: room,
      document: doc,
      token: AUTH_TOKEN || undefined,
      onAuthenticationFailed: (data: any) => {
        console.error("[Hocuspocus] Auth failed:", data);
        onAuthenticationFailed?.(data);
      },
    });

    return { provider, doc };
    // Only re-create when the room name changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    if (stableInitialPresence) {
      value.provider.setAwarenessField("user", stableInitialPresence);
    }
  }, [stableInitialPresence, value.provider]);

  useEffect(() => {
    return () => {
      value.provider.destroy();
      value.doc.destroy();
    };
  }, [value]);

  return React.createElement(HocuspocusContext.Provider, { value }, children);
}

export const HocuspocusRoomProvider = HocuspocusRoomProviderInner;

// ── Hook: useConnection ──────────────────────────────────────────────────────

export function useConnection(): { state: ConnectionState } {
  const { provider } = useHocuspocusContext();
  const [state, setState] = useState<ConnectionState>(() =>
    mapWebSocketStatus(provider.configuration.websocketProvider.status),
  );

  useEffect(() => {
    const sync = () => {
      setState(mapWebSocketStatus(provider.configuration.websocketProvider.status));
    };

    const onStatus = () => {
      sync();
    };

    sync();
    provider.on("status", onStatus);
    provider.on("connect", onStatus);
    provider.on("disconnect", onStatus);

    return () => {
      provider.off("status", onStatus);
      provider.off("connect", onStatus);
      provider.off("disconnect", onStatus);
    };
  }, [provider]);

  return { state };
}

// ── Hook: useMyPresence ──────────────────────────────────────────────────────

export function useMyPresence(): [
  Record<string, any>,
  (fields: Record<string, any>) => void,
] {
  const { provider } = useHocuspocusContext();

  const [presence, setPresenceState] = useState<Record<string, any>>(
    () => provider.awareness?.getLocalState()?.user ?? {},
  );

  const setPresence = useCallback(
    (fields: Record<string, any>) => {
      provider.setAwarenessField("user", fields);
      setPresenceState(fields);
    },
    [provider],
  );

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) {
      return;
    }

    const sync = () => {
      setPresenceState(awareness.getLocalState()?.user ?? {});
    };

    sync();
    awareness.on("change", sync);

    return () => {
      awareness.off("change", sync);
    };
  }, [provider]);

  return [presence, setPresence];
}

// ── Hook: useOthers ──────────────────────────────────────────────────────────

interface OtherUser {
  clientId: number;
  [key: string]: any;
}

export function useOthers(): OtherUser[] {
  const { provider } = useHocuspocusContext();
  const [others, setOthers] = useState<OtherUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    if (!awareness) return;

    const update = () => {
      const localClientId = awareness.clientID;
      const states: OtherUser[] = [];
      awareness.getStates().forEach((state: Record<string, any>, clientId: number) => {
        if (clientId === localClientId) return;
        if (state?.user) {
          states.push({ clientId, presence: state.user });
        }
      });
      setOthers(states);
    };

    update();
    awareness.on("change", update);
    awareness.on("update", update);
    return () => {
      awareness.off("change", update);
      awareness.off("update", update);
    };
  }, [provider]);

  return others;
}

// ── Hook: useStorage ─────────────────────────────────────────────────────────
// Returns [snapshot, yMap] for a named top-level Y.Map on the shared doc.
// The snapshot auto-updates on any remote or local mutation.

export function useStorage(
  mapName: string,
): [Record<string, any> | null, Y.Map<any> | null] {
  const { doc } = useHocuspocusContext();

  const yMap = useMemo(() => doc.getMap(mapName), [doc, mapName]);

  const [snapshot, setSnapshot] = useState<Record<string, any> | null>(() =>
    yMap ? Object.fromEntries(yMap.entries()) : null,
  );

  useEffect(() => {
    if (!yMap) return;

    const sync = () => {
      setSnapshot(Object.fromEntries(yMap.entries()));
    };

    sync();
    yMap.observeDeep(sync);
    return () => {
      yMap.unobserveDeep(sync);
    };
  }, [yMap]);

  return [snapshot, yMap];
}
