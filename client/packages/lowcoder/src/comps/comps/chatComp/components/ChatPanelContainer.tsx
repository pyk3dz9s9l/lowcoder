// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanelContainer.tsx

import React, { useState, useEffect } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
  ExternalStoreThreadListAdapter,
  CompleteAttachment,
  TextContentPart,
  ThreadUserContentPart
} from "@assistant-ui/react";
import { Thread } from "./assistant-ui/thread";
import { ThreadList } from "./assistant-ui/thread-list";
import { 
  ChatProvider,
  useChatContext, 
  RegularThreadData, 
  ArchivedThreadData 
} from "./context/ChatContext";
import { MessageHandler, ChatMessage } from "../types/chatTypes";
import styled from "styled-components";
import { trans } from "i18n";
import { universalAttachmentAdapter } from "../utils/attachmentAdapter";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";

// ============================================================================
// STYLED CONTAINER - SIMPLE FIXED STYLING FOR BOTTOM PANEL
// ============================================================================

const StyledChatContainer = styled.div<{
  autoHeight?: boolean;
  sidebarWidth?: string;
}>`
  display: flex;
  height: ${(props) => (props.autoHeight ? "auto" : "100%")};
  min-height: ${(props) => (props.autoHeight ? "300px" : "unset")};

  p {
    margin: 0;
  }

  .aui-thread-list-root {
    width: ${(props) => props.sidebarWidth || "250px"};
    background-color: #fff;
    padding: 10px;
  }

  .aui-thread-root {
    flex: 1;
    background-color: #f9fafb;
    height: auto;
  }

  .aui-thread-list-item {
    cursor: pointer;
    transition: background-color 0.2s ease;

    &[data-active="true"] {
      background-color: #dbeafe;
      border: 1px solid #bfdbfe;
    }
  }
`;

// ============================================================================
// CHAT PANEL CONTAINER - DIRECT RENDERING
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface ChatPanelContainerProps {
  storage: any;
  messageHandler: MessageHandler;
  placeholder?: string;
  onMessageUpdate?: (message: string) => void;
}

function ChatPanelView({ messageHandler, placeholder, onMessageUpdate }: Omit<ChatPanelContainerProps, 'storage'>) {
  const { state, actions } = useChatContext();
  const [isRunning, setIsRunning] = useState(false);

  const currentMessages = actions.getCurrentMessages();

  const convertMessage = (message: ChatMessage): ThreadMessageLike => {
    const content: ThreadUserContentPart[] = [{ type: "text", text: message.text }];
    
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.content) {
          content.push(...attachment.content);
        }
      }
    }
    
    return {
      role: message.role,
      content,
      id: message.id,
      createdAt: new Date(message.timestamp),
      ...(message.attachments && message.attachments.length > 0 && { attachments: message.attachments }),
    };
  };

  const onNew = async (message: AppendMessage) => {
    const textPart = (message.content as ThreadUserContentPart[]).find(
      (part): part is TextContentPart => part.type === "text"
    );
  
    const text = textPart?.text?.trim() ?? "";
    const completeAttachments = (message.attachments ?? []).filter(
      (att): att is CompleteAttachment => att.status.type === "complete"
    );
  
    if (!text && !completeAttachments.length) {
      throw new Error("Cannot send an empty message");
    }
  
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
      attachments: completeAttachments,
    };
  
    await actions.addMessage(state.currentThreadId, userMessage);
    setIsRunning(true);
  
    try {
      const response = await messageHandler.sendMessage(userMessage);
      onMessageUpdate?.(userMessage.text);
      
      await actions.addMessage(state.currentThreadId, {
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      });
    } catch (error) {
      await actions.addMessage(state.currentThreadId, {
        id: generateId(),
        role: "assistant",
        text: trans("chat.errorUnknown"),
        timestamp: Date.now(),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const onEdit = async (message: AppendMessage) => {
    const textPart = (message.content as ThreadUserContentPart[]).find(
      (part): part is TextContentPart => part.type === "text"
    );
  
    const text = textPart?.text?.trim() ?? "";
    const completeAttachments = (message.attachments ?? []).filter(
      (att): att is CompleteAttachment => att.status.type === "complete"
    );
  
    if (!text && !completeAttachments.length) {
      throw new Error("Cannot send an empty message");
    }
  
    const index = currentMessages.findIndex((m) => m.id === message.parentId) + 1;
    const newMessages = [...currentMessages.slice(0, index)];
  
    newMessages.push({
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
      attachments: completeAttachments,
    });
  
    await actions.updateMessages(state.currentThreadId, newMessages);
    setIsRunning(true);
  
    try {
      const response = await messageHandler.sendMessage(newMessages[newMessages.length - 1]);
      onMessageUpdate?.(text);
  
      newMessages.push({
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      });
      await actions.updateMessages(state.currentThreadId, newMessages);
    } catch (error) {
      newMessages.push({
        id: generateId(),
        role: "assistant",
        text: trans("chat.errorUnknown"),
        timestamp: Date.now(),
      });
      await actions.updateMessages(state.currentThreadId, newMessages);
    } finally {
      setIsRunning(false);
    }
  };

  const threadListAdapter: ExternalStoreThreadListAdapter = {
    threadId: state.currentThreadId,
    threads: state.threadList.filter((t): t is RegularThreadData => t.status === "regular"),
    archivedThreads: state.threadList.filter((t): t is ArchivedThreadData => t.status === "archived"),

    onSwitchToNewThread: async () => {
      const threadId = await actions.createThread(trans("chat.newChatTitle"));
      actions.setCurrentThread(threadId);
    },

    onSwitchToThread: (threadId) => {
      actions.setCurrentThread(threadId);
    },

    onRename: async (threadId, newTitle) => {
      await actions.updateThread(threadId, { title: newTitle });
    },

    onArchive: async (threadId) => {
      await actions.updateThread(threadId, { status: "archived" });
    },

    onDelete: async (threadId) => {
      await actions.deleteThread(threadId);
    },
  };

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (messages) => actions.updateMessages(state.currentThreadId, messages),
    convertMessage,
    isRunning,
    onNew,
    onEdit,
    adapters: {
      threadList: threadListAdapter,
      attachments: universalAttachmentAdapter,
    },
  });

  if (!state.isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StyledChatContainer>
        <ThreadList />
        <Thread placeholder={placeholder} />
      </StyledChatContainer>
    </AssistantRuntimeProvider>
  );
}

// ============================================================================
// EXPORT - WITH PROVIDERS
// ============================================================================

export function ChatPanelContainer({ storage, messageHandler, placeholder, onMessageUpdate }: ChatPanelContainerProps) {
  return (
    <TooltipProvider>
      <ChatProvider storage={storage}>
        <ChatPanelView 
          messageHandler={messageHandler}
          placeholder={placeholder}
          onMessageUpdate={onMessageUpdate}
        />
      </ChatProvider>
    </TooltipProvider>
  );
}
