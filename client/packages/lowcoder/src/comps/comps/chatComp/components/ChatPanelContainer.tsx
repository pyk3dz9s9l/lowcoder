// client/packages/lowcoder/src/comps/comps/chatComp/components/ChatPanelContainer.tsx

import React, { useState, useEffect, useRef, useContext } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
  ExternalStoreThreadListAdapter,
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
import { AIAssistantMessageHandler, ChatMessage } from "../types/chatTypes";
import styled from "styled-components";
import { trans } from "i18n";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import "@assistant-ui/styles/index.css";
import "@assistant-ui/styles/markdown.css";
import { EditorContext } from "@lowcoder-ee/comps/editorState";
import { configureComponentAction } from "../../preLoadComp/actions/componentConfiguration";
import { addComponentAction, moveComponentAction, nestComponentAction, resizeComponentAction } from "../../preLoadComp/actions/componentManagement";
import { applyThemeAction, configureAppMetaAction, setCanvasSettingsAction } from "../../preLoadComp/actions/appConfiguration";

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
  messageHandler: AIAssistantMessageHandler;
  placeholder?: string;
  onMessageUpdate?: (message: string) => void;
}

function ChatPanelView({ messageHandler, placeholder, onMessageUpdate }: Omit<ChatPanelContainerProps, 'storage'>) {
  const { state, actions } = useChatContext();
  const [isRunning, setIsRunning] = useState(false);
  const editorState = useContext(EditorContext);
  const editorStateRef = useRef(editorState);

  const currentMessages = actions.getCurrentMessages();

  // Keep the ref updated with the latest editorState
  useEffect(() => {
    // console.log("EDITOR STATE CHANGE ---> ", editorState);
    editorStateRef.current = editorState;
  }, [editorState]);

  const performAction = async (actions: any[]) => {
    if (!editorStateRef.current) {
      console.error("No editorStateRef found");
      return;
    }
  
    const comp = editorStateRef.current.getUIComp().children.comp;
    if (!comp) {
      console.error("No comp found");
      return;
    }
    // const layout = comp.children.layout.getView();
    // console.log("LAYOUT", layout);
  
    for (const actionItem of actions) {
      const { action, component, ...action_payload } = actionItem;
  
      switch (action) {
        case "place_component":
          await addComponentAction.execute({
            actionKey: action,
            actionValue: "",
            actionPayload: action_payload,
            selectedComponent: component,
            selectedEditorComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "nest_component":
          await nestComponentAction.execute({
            actionKey: action,
            actionValue: "",
            actionPayload: action_payload,
            selectedComponent: component,
            selectedEditorComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "move_component":
          await moveComponentAction.execute({
            actionKey: action,
            actionValue: "",
            actionPayload: action_payload,
            selectedComponent: component,
            selectedEditorComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "resize_component":
          await resizeComponentAction.execute({
            actionKey: action,
            actionValue: "",
            actionPayload: action_payload,
            selectedComponent: component,
            selectedEditorComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "set_properties":
          await configureComponentAction.execute({
            actionKey: action,
            actionValue: component,
            actionPayload: action_payload,
            selectedEditorComponent: null,
            selectedComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "set_theme":
          await applyThemeAction.execute({
            actionKey: action,
            actionValue: component,
            actionPayload: action_payload,
            selectedEditorComponent: null,
            selectedComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "set_app_metadata":
          await configureAppMetaAction.execute({
            actionKey: action,
            actionValue: component,
            actionPayload: action_payload,
            selectedEditorComponent: null,
            selectedComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        case "set_canvas_setting":
          await setCanvasSettingsAction.execute({
            actionKey: action,
            actionValue: component,
            actionPayload: action_payload,
            selectedEditorComponent: null,
            selectedComponent: null,
            selectedNestComponent: null,
            editorState: editorStateRef.current,
            selectedDynamicLayoutIndex: null,
            selectedTheme: null,
            selectedCustomShortcutAction: null
          });
          break;
        default:
          break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const convertMessage = (message: ChatMessage): ThreadMessageLike => {
    const content: ThreadUserContentPart[] = [{ type: "text", text: message.text }];
    
    return {
      role: message.role,
      content,
      id: message.id,
      createdAt: new Date(message.timestamp),
    };
  };

  const onNew = async (message: AppendMessage) => {
    const textPart = (message.content as ThreadUserContentPart[]).find(
      (part): part is TextContentPart => part.type === "text"
    );
  
    const text = textPart?.text?.trim() ?? "";
  
    if (!text) {
      throw new Error("Cannot send an empty message");
    }
  
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
  
    const conversationHistory = [...currentMessages, userMessage];
  
    await actions.addMessage(state.currentThreadId, userMessage);
    setIsRunning(true);
  
    try {
      const response = await messageHandler.sendMessage(
        userMessage,
        state.currentThreadId,
        conversationHistory
      );
      onMessageUpdate?.(userMessage.text);
      
      if (response?.actions?.length) {
        performAction(response.actions);
      }

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
  
    if (!text) {
      throw new Error("Cannot send an empty message");
    }
  
    const index = currentMessages.findIndex((m) => m.id === message.parentId) + 1;
    const newMessages = [...currentMessages.slice(0, index)];
  
    newMessages.push({
      id: generateId(),
      role: "user",
      text,
      timestamp: Date.now(),
    });
  
    await actions.updateMessages(state.currentThreadId, newMessages);
    setIsRunning(true);
  
    try {
      const response = await messageHandler.sendMessage(
        newMessages[newMessages.length - 1],
        state.currentThreadId,
        newMessages
      );
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
      // No attachments support for bottom panel chat
    },
  });

  if (!state.isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <StyledChatContainer>
        <ThreadList />
        <Thread placeholder={placeholder} showAttachments={false} />
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
