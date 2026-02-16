// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatContainer.tsx

import React, { useState, useEffect, useRef } from "react";
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
import { MessageHandler, ChatMessage, ChatCoreProps } from "../types/chatTypes";
import styled from "styled-components";
import { trans } from "i18n";
import { universalAttachmentAdapter } from "../utils/attachmentAdapter";

// ============================================================================
// STYLED CONTAINER - FOLLOWING LOWCODER PATTERNS
// Styles passed as objects, applied directly like Button100 and InputStyle
// ============================================================================

const StyledChatContainer = styled.div<ChatCoreProps>`
  display: flex;
  height: ${(props) => (props.autoHeight ? "auto" : "100%")};
  min-height: ${(props) => (props.autoHeight ? "300px" : "unset")};

  /* Main container styles */
  background: ${(props) => props.style?.background || "transparent"};
  margin: ${(props) => props.style?.margin || "0"};
  padding: ${(props) => props.style?.padding || "0"};
  border: ${(props) => props.style?.borderWidth || "0"} ${(props) => props.style?.borderStyle || "solid"} ${(props) => props.style?.border || "transparent"};
  border-radius: ${(props) => props.style?.radius || "0"};

  /* Animation styles */
  animation: ${(props) => props.animationStyle?.animation || "none"};
  animation-duration: ${(props) => props.animationStyle?.animationDuration || "0s"};
  animation-delay: ${(props) => props.animationStyle?.animationDelay || "0s"};
  animation-iteration-count: ${(props) => props.animationStyle?.animationIterationCount || "1"};

  p {
    margin: 0;
  }

  /* Sidebar Styles */
  .aui-thread-list-root {
    width: ${(props) => props.sidebarWidth || "250px"};
    background-color: ${(props) => props.sidebarStyle?.sidebarBackground || "#fff"};
    padding: 10px;
  }

  .aui-thread-list-item-title {
    color: ${(props) => props.sidebarStyle?.threadText || "inherit"};
  }

  /* Messages Window Styles */
  .aui-thread-root {
    flex: 1;
    background-color: ${(props) => props.messagesStyle?.messagesBackground || "#f9fafb"};
    height: auto;
  }

  /* User Message Styles */
  .aui-user-message-content {
    background-color: ${(props) => props.messagesStyle?.userMessageBackground || "#3b82f6"};
    color: ${(props) => props.messagesStyle?.userMessageText || "#ffffff"};
  }

  /* Assistant Message Styles */
  .aui-assistant-message-content {
    background-color: ${(props) => props.messagesStyle?.assistantMessageBackground || "#ffffff"};
    color: ${(props) => props.messagesStyle?.assistantMessageText || "inherit"};
  }

  /* Input Field Styles */
  form.aui-composer-root {
    background-color: ${(props) => props.inputStyle?.inputBackground || "#ffffff"};
    color: ${(props) => props.inputStyle?.inputText || "inherit"};
    border-color: ${(props) => props.inputStyle?.inputBorder || "#d1d5db"};
  }

  /* Send Button Styles */
  .aui-composer-send {
    background-color: ${(props) => props.sendButtonStyle?.sendButtonBackground || "#3b82f6"} !important;
    
    svg {
      color: ${(props) => props.sendButtonStyle?.sendButtonIcon || "#ffffff"};
    }
  }

  /* New Thread Button Styles */
  .aui-thread-list-root > button {
    background-color: ${(props) => props.newThreadButtonStyle?.newThreadBackground || "#3b82f6"} !important;
    color: ${(props) => props.newThreadButtonStyle?.newThreadText || "#ffffff"} !important;
    border-color: ${(props) => props.newThreadButtonStyle?.newThreadBackground || "#3b82f6"} !important;
  }

  /* Thread item styling */
  .aui-thread-list-item {
    cursor: pointer;
    transition: background-color 0.2s ease;
    background-color: ${(props) => props.threadItemStyle?.threadItemBackground || "transparent"};
    color: ${(props) => props.threadItemStyle?.threadItemText || "inherit"};
    border: 1px solid ${(props) => props.threadItemStyle?.threadItemBorder || "transparent"};

    &[data-active="true"] {
      background-color: ${(props) => props.threadItemStyle?.activeThreadBackground || "#dbeafe"};
      color: ${(props) => props.threadItemStyle?.activeThreadText || "inherit"};
      border: 1px solid ${(props) => props.threadItemStyle?.activeThreadBorder || "#bfdbfe"};
    }
  }
`;

// ============================================================================
// CHAT CONTAINER - USES CONTEXT FROM CHATPROVIDER
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

function ChatContainerView(props: ChatCoreProps) {
  const { state, actions } = useChatContext();
  const [isRunning, setIsRunning] = useState(false);

  // Store callback props in refs so useEffects don't re-fire
  // when Lowcoder's builder creates new function references on each render
  const onConversationUpdateRef = useRef(props.onConversationUpdate);
  onConversationUpdateRef.current = props.onConversationUpdate;

  const onEventRef = useRef(props.onEvent);
  onEventRef.current = props.onEvent;

  const currentMessages = actions.getCurrentMessages();

  useEffect(() => {
    if (currentMessages.length > 0 && !isRunning) {
      onConversationUpdateRef.current?.(currentMessages);
    }
  }, [currentMessages, isRunning]);

  useEffect(() => {
    onEventRef.current?.("componentLoad");
  }, []);

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
      const response = await props.messageHandler.sendMessage(userMessage);
      props.onMessageUpdate?.(userMessage.text);
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      };
  
      await actions.addMessage(state.currentThreadId, assistantMessage);
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
      const response = await props.messageHandler.sendMessage(editedMessage);
      props.onMessageUpdate?.(editedMessage.text);
  
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: response.content,
        timestamp: Date.now(),
      };
  
      newMessages.push(assistantMessage);
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
      props.onEvent?.("threadCreated");
    },

    onSwitchToThread: (threadId) => {
      actions.setCurrentThread(threadId);
    },

    onRename: async (threadId, newTitle) => {
      await actions.updateThread(threadId, { title: newTitle });
      props.onEvent?.("threadUpdated");
    },

    onArchive: async (threadId) => {
      await actions.updateThread(threadId, { status: "archived" });
      props.onEvent?.("threadUpdated");
    },

    onDelete: async (threadId) => {
      await actions.deleteThread(threadId);
      props.onEvent?.("threadDeleted");
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
      <StyledChatContainer {...props}>
        <ThreadList />
        <Thread placeholder={props.placeholder} />
      </StyledChatContainer>
    </AssistantRuntimeProvider>
  );
}

// ============================================================================
// EXPORT - SIMPLIFIED (PROVIDERS MOVED UP ONE LEVEL)
// ============================================================================

export const ChatContainer = ChatContainerView;
