// ──────────────────────────────────────────────────────────────────────────────
// DEPRECATED — This hook is no longer used.
//
// Architecture change (v2):
//   • ChatControllerV2Comp  — signal server (Pluv/Yjs) for presence,
//     typing, and message-activity broadcasts.
//   • ChatBoxV2Comp         — pure UI component that receives messages
//     from external data queries and fires events.
//
// All Pluv/Yjs logic now lives in ChatControllerV2Comp.
// Data storage is handled by the user's own Data Sources & Queries.
// ──────────────────────────────────────────────────────────────────────────────

export {};
