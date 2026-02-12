// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanelCore.tsx

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
  useChatContext, 
  RegularThreadData, 
  ArchivedThreadData 
} from "./context/ChatContext";
import { MessageHandler, ChatMessage } from "../types/chatTypes";
import styled from "styled-components";
import { trans } from "i18n";
import { universalAttachmentAdapter } from "../utils/attachmentAdapter";

// ============================================================================
// SIMPLE STYLED COMPONENTS - FIXED STYLING FOR BOTTOM PANEL
// ============================================================================

const ChatContainer = styled.div<{
  $autoHeight?: boolean;
  $sidebarWidth?: string;
}>`
  display: flex;
  height: ${(props) => (props.$autoHeight ? "auto" : "100%")};
  min-height: ${(props) => (props.$autoHeight ? "300px" : "unset")};

  p {
    margin: 0;
  }

  .aui-thread-list-root {
    width: ${(props) => props.$sidebarWidth || "250px"};
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
// CHAT PANEL CORE - SIMPLIFIED FOR BOTTOM PANEL (NO STYLING PROPS)
// ============================================================================

interface ChatPanelCoreProps {
  messageHandler: MessageHandler;
  placeholder?: string;
  autoHeight?: boolean;
  sidebarWidth?: string;
  onMessageUpdate?: (message: string) => void;
  onConversationUpdate?: (conversationHistory: ChatMessage[]) => void;
  onEvent?: (eventName: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function ChatPanelCore({ 
  messageHandler, 
  placeholder,
  autoHeight,
  sidebarWidth,
  onMessageUpdate, 
  onConversationUpdate,
  onEvent
}: ChatPanelCoreProps) {
  const { state, actions } = useChatContext();
  const [isRunning, setIsRunning] = useState(false);

  // Get messages for current thread
  const currentMessages = actions.getCurrentMessages();

  // Notify parent component of conversation changes
  useEffect(() => {
    if (currentMessages.length > 0 && !isRunning) {
      onConversationUpdate?.(currentMessages);
    }
  }, [currentMessages, isRunning]);

  // Trigger component load event on mount
  useEffect(() => {
    onEvent?.("componentLoad");
  }, [onEvent]);

  // Convert custom format to ThreadMessageLike
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

  // Handle new message
  const onNew = async (message: AppendMessage) => {
    const textPart = (message.content as ThreadUserContentPart[]).find(
      (part): part is TextContentPart => part.type === "text"
    );
  
    const text = textPart?.text?.trim() ?? "";
  
    const completeAttachments = (message.attachments ?? []).filter(
      (att): att is CompleteAttachment => att.status.type === "complete"
    );
  
    const hasText = text.length > 0;
    const hasAttachments = completeAttachments.length > 0;
  
    if (!hasText && !hasAttachments) {
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
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      };
  
      await actions.addMessage(state.currentThreadId, assistantMessage);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: trans("chat.errorUnknown"),
        timestamp: Date.now(),
      };
  
      await actions.addMessage(state.currentThreadId, errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle edit message
  const onEdit = async (message: AppendMessage) => {
    const textPart = (message.content as ThreadUserContentPart[]).find(
      (part): part is TextContentPart => part.type === "text"
    );
  
    const text = textPart?.text?.trim() ?? "";
  
    const completeAttachments = (message.attachments ?? []).filter(
      (att): att is CompleteAttachment => att.status.type === "complete"
    );
  
    const hasText = text.length > 0;
    const hasAttachments = completeAttachments.length > 0;
  
    if (!hasText && !hasAttachments) {
      throw new Error("Cannot send an empty message");
    }
  
    const index = currentMessages.findIndex((m) => m.id === message.parentId) + 1;
    const newMessages = [...currentMessages.slice(0, index)];
  
    const editedMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
      attachments: completeAttachments,
    };
  
    newMessages.push(editedMessage);
    await actions.updateMessages(state.currentThreadId, newMessages);
    setIsRunning(true);
  
    try {
      const response = await messageHandler.sendMessage(editedMessage);
  
      onMessageUpdate?.(editedMessage.text);
  
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      };
  
      newMessages.push(assistantMessage);
      await actions.updateMessages(state.currentThreadId, newMessages);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: trans("chat.errorUnknown"),
        timestamp: Date.now(),
      };
  
      newMessages.push(errorMessage);
      await actions.updateMessages(state.currentThreadId, newMessages);
    } finally {
      setIsRunning(false);
    }
  };

  // Thread list adapter
  const threadListAdapter: ExternalStoreThreadListAdapter = {
    threadId: state.currentThreadId,
    threads: state.threadList.filter((t): t is RegularThreadData => t.status === "regular"),
    archivedThreads: state.threadList.filter((t): t is ArchivedThreadData => t.status === "archived"),

    onSwitchToNewThread: async () => {
      const threadId = await actions.createThread(trans("chat.newChatTitle"));
      actions.setCurrentThread(threadId);
      onEvent?.("threadCreated");
    },

    onSwitchToThread: (threadId) => {
      actions.setCurrentThread(threadId);
    },

    onRename: async (threadId, newTitle) => {
      await actions.updateThread(threadId, { title: newTitle });
      onEvent?.("threadUpdated");
    },

    onArchive: async (threadId) => {
      await actions.updateThread(threadId, { status: "archived" });
      onEvent?.("threadUpdated");
    },

    onDelete: async (threadId) => {
      await actions.deleteThread(threadId);
      onEvent?.("threadDeleted");
    },
  };

  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (messages) => {
      actions.updateMessages(state.currentThreadId, messages);
    },
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
      <ChatContainer $autoHeight={autoHeight} $sidebarWidth={sidebarWidth}>
        <ThreadList />
        <Thread placeholder={placeholder} />
      </ChatContainer>
    </AssistantRuntimeProvider>
  );
}
