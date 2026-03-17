import { createClient } from "@pluv/client";
import { yjs } from "@pluv/crdt-yjs";
import { createBundle } from "@pluv/react";
import { z } from "zod";

// Resolve the pluv.io publishable key from the environment.
// This is set at build time via VITE_PLUV_PUBLIC_KEY, or injected at runtime
// via globalThis.__PLUV_PUBLIC_KEY__ (e.g. from a server-rendered template).
const PLUV_PUBLIC_KEY: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PLUV_PUBLIC_KEY) ||
  (typeof globalThis !== "undefined" && (globalThis as any).__PLUV_PUBLIC_KEY__) ||
  "";

// Auth server URL. Defaults to a relative path so the Vite dev proxy and
// production reverse-proxy both work without extra configuration.
const PLUV_AUTH_URL: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_PLUV_AUTH_URL) ||
  "/api/auth/pluv";

// `metadata` is PLUV's built-in mechanism for passing per-connection data
// (like the current user) into the authEndpoint at the moment a room is
// entered. It is provided as a prop on <PluvRoomProvider metadata={...} />,
// so there is no need for any global mutable config object.
const client = createClient({
  metadata: z.object({
    userId: z.string(),
    userName: z.string(),
  }),
  publicKey: PLUV_PUBLIC_KEY,
  authEndpoint: ({ room, metadata }: { room: string; metadata: { userId: string; userName: string } }) => {
    const params = new URLSearchParams({
      room,
      userId: metadata.userId,
      userName: metadata.userName,
    });
    return `${PLUV_AUTH_URL}?${params}`;
  },
  initialStorage: yjs.doc((t: any) => ({
    messageActivity: t.map("messageActivity", []),
    aiActivity: t.map("aiActivity", []),
  })),
  presence: z.object({
    userId: z.string(),
    userName: z.string(),
    currentRoomId: z.string().nullable(),
    typing: z.boolean(),
  }),
} as any);

export const {
  PluvRoomProvider,
  useStorage,
  useTransact,
  useMyPresence,
  useMyself,
  useOthers,
  useRoom,
  useConnection,
  useDoc,
} = createBundle(client);
