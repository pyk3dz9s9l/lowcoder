// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanel.tsx

import { useMemo } from "react";
import { ChatProvider } from "./context/ChatContext";
import { ChatPanelCore } from "./ChatPanelCore";
import { createChatStorage } from "../utils/storageFactory";
import { N8NHandler } from "../handlers/messageHandlers";
import { ChatPanelProps } from "../types/chatTypes";
import { trans } from "i18n";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";

// ============================================================================
// CHAT PANEL - SIMPLIFIED BOTTOM PANEL COMPONENT (NO STYLING CONTROLS)
// ============================================================================

export function ChatPanel({
  tableName,
  modelHost,
  systemPrompt = trans("chat.defaultSystemPrompt"),
  streaming = true,
  onMessageUpdate
}: ChatPanelProps) {
  // Create storage instance
  const storage = useMemo(() => 
    createChatStorage(tableName), 
    [tableName]
  );
  
  // Create N8N message handler
  const messageHandler = useMemo(() => 
    new N8NHandler({
      modelHost,
      systemPrompt,
      streaming
    }), 
    [modelHost, systemPrompt, streaming]
  );

  return (
    <TooltipProvider>
      <ChatProvider storage={storage}>
        <ChatPanelCore
          messageHandler={messageHandler}
          onMessageUpdate={onMessageUpdate}
        />
      </ChatProvider>
    </TooltipProvider>
  );
}