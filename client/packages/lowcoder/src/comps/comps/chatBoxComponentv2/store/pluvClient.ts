import { createClient } from "@pluv/client";
import { yjs } from "@pluv/crdt-yjs";
import { createBundle } from "@pluv/react";
import { z } from "zod";

/**
 * Module-level config object updated by the component before connecting.
 * This allows dynamic auth without recreating the client.
 *
 * IMPORTANT: set pluvConfig.publicKey (from the component's pluvPublicKey prop)
 * BEFORE PluvRoomProvider mounts so the pluv client has the key at connection time.
 */
export const pluvConfig = {
  userId: "",
  userName: "",
  authUrl: "/api/auth/pluv",
  /** Populated from the component's "Public Key" property-panel field. */
  publicKey: "",
};

/**
 * Returns the public key at call-time (lazy) so the component can set
 * pluvConfig.publicKey before pluv opens its first WebSocket connection.
 * Falls back to build-time env vars / globalThis for non-component usages.
 */
function resolvePluvPublicKey(): string {
  return (
    pluvConfig.publicKey ||
    (typeof globalThis !== "undefined"
      ? (globalThis as any).__PLUV_PUBLIC_KEY__
      : "") ||
    (typeof import.meta !== "undefined"
      ? (import.meta as any).env?.VITE_PLUV_PUBLIC_KEY
      : "") ||
    ""
  );
}

const client = createClient({
  authEndpoint: (({ room }: { room: string }) => {
    const params = new URLSearchParams({
      room,
      userId: pluvConfig.userId,
      userName: pluvConfig.userName,
    });
    return `${pluvConfig.authUrl}?${params}`;
  }) as any,
  publicKey: resolvePluvPublicKey as any,
  initialStorage: yjs.doc((t: any) => ({
    rooms: t.map("rooms", []),
    members: t.map("members", []),
    invites: t.map("invites", []),
    messages: t.map("messages", []),
  })),
  presence: z.object({
    typing: z
      .object({
        userId: z.string(),
        userName: z.string(),
        roomId: z.string(),
      })
      .nullable(),
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
