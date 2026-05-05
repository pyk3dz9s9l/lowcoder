// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanel.tsx

import { useMemo, useContext, useRef, useEffect } from "react";
import { ChatPanelContainer } from "./ChatPanelContainer";
import { createChatStorage } from "../utils/storageFactory";
import { AIAssistantQueryHandler } from "../handlers/messageHandlers";
import { ChatPanelProps } from "../types/chatTypes";
import { EditorContext } from "@lowcoder-ee/comps/editorState";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";

// ============================================================================
// CHAT PANEL - SIMPLIFIED BOTTOM PANEL (QUERY-BASED + AUTOMATOR)
// ----------------------------------------------------------------------------
// We capture the EditorState in a ref so the message handler always reads
// the *latest* canvas snapshot at send-time (instead of being frozen at
// mount time, which would defeat the whole point of context awareness).
// ============================================================================

interface ExtendedChatPanelProps extends ChatPanelProps {
  /** When false, send conversation history without the Automator system prompt. */
  enableAutomator?: boolean;
}

export function ChatPanel({
  tableName,
  chatQuery,
  onMessageUpdate,
  enableAutomator = true,
}: ExtendedChatPanelProps) {
  const editorState = useContext(EditorContext);
  const editorStateRef = useRef(editorState);

  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  const storage = useMemo(() =>
    createChatStorage(tableName),
    [tableName]
  );

  const messageHandler = useMemo(
    () =>
      new AIAssistantQueryHandler({
        chatQuery,
        dispatch: editorState?.rootComp?.dispatch,
        getEditorState: () => editorStateRef.current,
        enableAutomator,
      }),
    [chatQuery, editorState?.rootComp?.dispatch, enableAutomator]
  );

  return (
    <ChatPanelContainer
      storage={storage}
      messageHandler={messageHandler}
      onMessageUpdate={onMessageUpdate}
    />
  );
}
