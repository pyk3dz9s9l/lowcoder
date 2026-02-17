// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanel.tsx

import { useMemo, useEffect } from "react";
import { ChatPanelContainer } from "./ChatPanelContainer";
import { createChatStorage } from "../utils/storageFactory";
import { N8NHandler } from "../handlers/messageHandlers";
import { ChatPanelProps } from "../types/chatTypes";
import { trans } from "i18n";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";

// ============================================================================
// CHAT PANEL - SIMPLIFIED BOTTOM PANEL (NO STYLING CONTROLS)
// ============================================================================

export function ChatPanel({
  tableName,
  modelHost,
  systemPrompt = trans("chat.defaultSystemPrompt"),
  streaming = true,
  onMessageUpdate
}: ChatPanelProps) {
  const storage = useMemo(() =>
    createChatStorage(tableName),
    [tableName]
  );

  const messageHandler = useMemo(() =>
    new N8NHandler({
      modelHost,
      systemPrompt,
      streaming
    }),
    [modelHost, systemPrompt, streaming]
  );

  // Cleanup on unmount - delete chat data from storage
  useEffect(() => {
    return () => {
      storage.cleanup();
    };
  }, [storage]);

  return (
    <ChatPanelContainer
      storage={storage}
      messageHandler={messageHandler}
      onMessageUpdate={onMessageUpdate}
    />
  );
}