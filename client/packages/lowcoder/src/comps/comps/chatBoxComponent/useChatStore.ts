// ──────────────────────────────────────────────────────────────────────────────
// DEPRECATED — This hook is no longer used.
//
// Architecture change:
//   • Chat Controller  — real-time coordination (Pluv/Yjs) for presence,
//     typing, and message-activity broadcasts.
//   • ChatBoxComp      — pure UI component that receives messages
//     from external data queries and fires events.
//
// All Pluv/Yjs logic now lives in ChatControllerComp.
// Data storage is handled by the user's own Data Sources & Queries.
// ──────────────────────────────────────────────────────────────────────────────

export {};
