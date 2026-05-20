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
import { Thread } from "components/assistant-ui/thread";
import { ThreadList } from "components/assistant-ui/thread-list";
import { 
  useChatContext, 
  RegularThreadData, 
  ArchivedThreadData 
} from "./context/ChatContext";
import { MessageHandler, ChatMessage, ChatCoreProps } from "../types/chatTypes";
import { trans } from "i18n";
import { universalAttachmentAdapter } from "../utils/attachmentAdapter";
import { StyledChatContainer } from "./ChatContainerStyles";

// ============================================================================
//   CHAT CONTAINER 
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

function ChatContainerView(props: ChatCoreProps) {
  const { state, actions } = useChatContext();
  const [isRunning, setIsRunning] = useState(false);

  // callback props in refs so useEffects don't re-fire
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
      <StyledChatContainer
        style={props.style}
        $autoHeight={props.autoHeight}
        $sidebarWidth={props.sidebarWidth}
        $sidebarStyle={props.sidebarStyle}
        $messagesStyle={props.messagesStyle}
        $inputStyle={props.inputStyle}
        $sendButtonStyle={props.sendButtonStyle}
        $newThreadButtonStyle={props.newThreadButtonStyle}
        $threadItemStyle={props.threadItemStyle}
        $animationStyle={props.animationStyle}
      >
        <ThreadList />
        <Thread placeholder={props.placeholder} />
      </StyledChatContainer>
    </AssistantRuntimeProvider>
  );
}

// ============================================================================
//   EXPORT 
// ============================================================================

export const ChatContainer = ChatContainerView;
