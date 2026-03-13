// ──────────────────────────────────────────────────────────────────────────────
// DEPRECATED — This hook is no longer used.
//
// Architecture change (v2):
//   • ChatControllerSignal  — signal server (Pluv/Yjs) for presence,
//     typing, and message-activity broadcasts.
//   • ChatBoxV2Comp         — pure UI component that receives messages
//     from external data queries and fires events.
//
// All Pluv/Yjs logic now lives in ChatControllerSignal.
// Data storage is handled by the user's own Data Sources & Queries.
// ──────────────────────────────────────────────────────────────────────────────

export {};
