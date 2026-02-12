// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatCore.tsx

import React from "react";
import { ChatProvider } from "./context/ChatContext";
import { ChatCoreMain } from "./ChatCoreMain";
import { ChatCoreProps } from "../types/chatTypes";
import { TooltipProvider } from "@radix-ui/react-tooltip";

// ============================================================================
// CHAT CORE - THE SHARED FOUNDATION
// ============================================================================

export function ChatCore({ 
  storage, 
  messageHandler, 
  placeholder,
  autoHeight,
  sidebarWidth,
  onMessageUpdate, 
  onConversationUpdate,
  onEvent,
  style,
  sidebarStyle,
  messagesStyle,
  inputStyle,
  sendButtonStyle,
  newThreadButtonStyle,
  threadItemStyle,
  animationStyle
}: ChatCoreProps) {
  return (
    <TooltipProvider>
      <ChatProvider storage={storage}>
        <ChatCoreMain 
          messageHandler={messageHandler}
          placeholder={placeholder}
          autoHeight={autoHeight}
          sidebarWidth={sidebarWidth}
          onMessageUpdate={onMessageUpdate}
          onConversationUpdate={onConversationUpdate}
          onEvent={onEvent}
          style={style}
          sidebarStyle={sidebarStyle}
          messagesStyle={messagesStyle}
          inputStyle={inputStyle}
          sendButtonStyle={sendButtonStyle}
          newThreadButtonStyle={newThreadButtonStyle}
          threadItemStyle={threadItemStyle}
          animationStyle={animationStyle}
        />
      </ChatProvider>
    </TooltipProvider>
  );
}