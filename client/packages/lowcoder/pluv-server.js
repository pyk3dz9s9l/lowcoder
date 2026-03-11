#!/usr/bin/env node

/**
 * Pluv.io Auth & Webhook Server for ChatBox v2
 *
 * Replaces yjs-websocket-server.js — pluv.io manages all WebSocket
 * infrastructure, so this server only handles:
 *   1. Token creation (auth endpoint)
 *   2. Webhook ingestion (server-side events like storage persistence)
 *
 * Required env vars:
 *   PLUV_PUBLISHABLE_KEY  – your pluv.io public/publishable key
 *   PLUV_SECRET_KEY       – your pluv.io secret key
 *   PLUV_WEBHOOK_SECRET   – (optional) webhook signing secret
 *
 * Usage: node pluv-server.js
 */

import { createIO } from "@pluv/io";
import { platformPluv } from "@pluv/platform-pluv";
import { yjs } from "@pluv/crdt-yjs";
import { z } from "zod";
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 3006;
const HOST = process.env.HOST || "0.0.0.0";

const PLUV_PUBLISHABLE_KEY = process.env.PLUV_PUBLISHABLE_KEY;
const PLUV_SECRET_KEY = process.env.PLUV_SECRET_KEY;
const PLUV_WEBHOOK_SECRET = process.env.PLUV_WEBHOOK_SECRET;

if (!PLUV_PUBLISHABLE_KEY || !PLUV_SECRET_KEY) {
  console.error(
    "Missing required env vars: PLUV_PUBLISHABLE_KEY, PLUV_SECRET_KEY",
  );
  process.exit(1);
}

// ── Pluv IO setup ─────────────────────────────────────────────────────────

const io = createIO(
  platformPluv({
    authorize: {
      user: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
    crdt: yjs,
    publicKey: PLUV_PUBLISHABLE_KEY,
    secretKey: PLUV_SECRET_KEY,
    basePath: "/api/pluv",
    ...(PLUV_WEBHOOK_SECRET ? { webhookSecret: PLUV_WEBHOOK_SECRET } : {}),
  }),
);

const ioServer = io.server({
  getInitialStorage: async ({ room }) => {
    // No persistence yet — rooms start with empty storage.
    // To add persistence, load encodedState from a database here.
    console.log(`[pluv] getInitialStorage for room: ${room}`);
    return null;
  },

  onRoomDestroyed: async ({ room }) => {
    console.log(`[pluv] Room destroyed: ${room}`);
  },

  onStorageDestroyed: async ({ room, encodedState }) => {
    // To persist storage, save encodedState to a database here.
    console.log(
      `[pluv] Storage destroyed for room: ${room} (${encodedState ? encodedState.length + " bytes" : "empty"})`,
    );
  },
});

// ── Express app ───────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    server: "pluv-chat",
    timestamp: new Date().toISOString(),
  });
});

// Webhook endpoint — pluv.io sends server events here
app.post("/api/pluv/webhook", async (req, res) => {
  try {
    // Convert express req/res to a standard Request for ioServer.fetch
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }

    const fetchReq = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const fetchRes = await ioServer.fetch(fetchReq);
    const body = await fetchRes.text();
    res.status(fetchRes.status).send(body);
  } catch (err) {
    console.error("[pluv] Webhook error:", err);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

// Auth endpoint — creates a JWT token for the requesting user (must be after webhook route)
app.get("/api/auth/pluv", async (req, res) => {
  try {
    const room = req.query.room;
    const userId = req.query.userId;
    const userName = req.query.userName;

    if (!room || !userId) {
      return res.status(400).json({ error: "Missing room or userId" });
    }

    const token = await ioServer.createToken({
      room: String(room),
      user: {
        id: String(userId),
        name: String(userName || userId),
      },
    });

    // pluv expects the token as a plain text response
    res.status(200).send(token);
  } catch (err) {
    console.error("[pluv] Auth error:", err);
    res.status(500).json({ error: "Token creation failed" });
  }
});

// ── Start server ──────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
  console.log(`\n  Pluv Chat Server running on http://${HOST}:${PORT}`);
  console.log(`  Auth endpoint:    GET  /api/auth/pluv?room=...&userId=...`);
  console.log(`  Webhook endpoint: POST /api/pluv/webhook`);
  console.log(`  Health check:     GET  /health\n`);
});
