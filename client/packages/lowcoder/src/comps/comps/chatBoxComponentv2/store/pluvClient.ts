import { createClient } from "@pluv/client";
import { yjs } from "@pluv/crdt-yjs";
import { createBundle } from "@pluv/react";
import { z } from "zod";

/**
 * Module-level config updated by ChatControllerV2 before connecting.
 * Allows dynamic auth without recreating the client.
 */
export const pluvConfig = {
  userId: "",
  userName: "",
  authUrl: "/api/auth/pluv",
  publicKey: "",
};

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
    messageActivity: t.map("messageActivity", []),
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
