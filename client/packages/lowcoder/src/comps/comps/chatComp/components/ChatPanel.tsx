// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanel.tsx

import { useMemo, useContext } from "react";
import { ChatPanelContainer } from "./ChatPanelContainer";
import { createChatStorage } from "../utils/storageFactory";
import { AIAssistantQueryHandler } from "../handlers/messageHandlers";
import { ChatPanelProps } from "../types/chatTypes";
import { EditorContext } from "@lowcoder-ee/comps/editorState";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";

// ============================================================================
// CHAT PANEL - SIMPLIFIED BOTTOM PANEL (QUERY-BASED)
// ============================================================================

export function ChatPanel({
  tableName,
  chatQuery,
  onMessageUpdate
}: ChatPanelProps) {
  const editorState = useContext(EditorContext);

  const storage = useMemo(() =>
    createChatStorage(tableName),
    [tableName]
  );

  const messageHandler = useMemo(() =>
    new AIAssistantQueryHandler({
      chatQuery,
      dispatch: editorState?.rootComp?.dispatch,
    }),
    [chatQuery, editorState?.rootComp?.dispatch]
  );

  return (
    <ChatPanelContainer
      storage={storage}
      messageHandler={messageHandler}
      onMessageUpdate={onMessageUpdate}
    />
  );
}
