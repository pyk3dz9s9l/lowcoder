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
import { ActionConfig, ActionExecuteParams } from "../../preLoadComp/types";
import { configureComponentAction } from "../../preLoadComp/actions/componentConfiguration";
import {
  addComponentAction,
  moveComponentAction,
  nestComponentAction,
  resizeComponentAction,
  deleteComponentAction,
  renameComponentAction,
} from "../../preLoadComp/actions/componentManagement";
import {
  applyThemeAction,
  configureAppMetaAction,
  setCanvasSettingsAction,
  applyGlobalJSAction,
  applyCSSAction,
  publishAppAction,
} from "../../preLoadComp/actions/appConfiguration";
import { applyStyleAction } from "../../preLoadComp/actions/componentStyling";
import { addEventHandlerAction } from "../../preLoadComp/actions/componentEvents";
import { alignComponentAction } from "../../preLoadComp/actions/componentLayout";

// ============================================================================
// ACTION REGISTRY — maps LLM action names to their executor configs.
// Adding a new action is one line here + one entry in actionsCatalog.ts.
// ============================================================================

const ACTION_REGISTRY: Record<string, ActionConfig> = {
  place_component: addComponentAction,
  nest_component: nestComponentAction,
  move_component: moveComponentAction,
  resize_component: resizeComponentAction,
  delete_component: deleteComponentAction,
  rename_component: renameComponentAction,
  set_properties: configureComponentAction,
  set_style: applyStyleAction,
  set_theme: applyThemeAction,
  set_app_metadata: configureAppMetaAction,
  set_canvas_setting: setCanvasSettingsAction,
  set_global_javascript: applyGlobalJSAction,
  set_global_css: applyCSSAction,
  publish_app: publishAppAction,
  add_event_handler: addEventHandlerAction,
  align_component: alignComponentAction,
};

/**
 * Translate an LLM action object into the ActionExecuteParams shape that
 * the legacy executor functions expect. Centralises the field-mapping so
 * each executor doesn't need to know about the automator format.
 */
function buildExecuteParams(
  actionItem: Record<string, any>,
  editorState: any
): ActionExecuteParams {
  const ap = actionItem.action_parameters || {};

  let actionValue = "";
  switch (actionItem.action) {
    case "rename_component":       actionValue = ap.new_name || ""; break;
    case "set_style":              actionValue = JSON.stringify(ap); break;
    case "align_component":        actionValue = ap.alignment || "center"; break;
    case "add_event_handler":      actionValue = `${ap.event || "click"}: ${ap.action_type || "message"}`; break;
    case "set_global_javascript":  actionValue = ap.code || ""; break;
    case "set_global_css":         actionValue = ap.code || ""; break;
  }

  return {
    actionKey: actionItem.action,
    actionValue,
    actionPayload: actionItem,
    selectedComponent: actionItem.component || null,
    selectedEditorComponent: actionItem.component_name || null,
    selectedNestComponent: null,
    editorState,
    selectedDynamicLayoutIndex: null,
    selectedTheme: null,
    selectedCustomShortcutAction: null,
  };
}

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

/**
 * Append a small footer to the assistant message summarising what the
 * Automator just did, so the human can audit at a glance.
 */
function formatAutomatorFooter(actionsCount: number, invalidCount: number): string {
  if (actionsCount === 0 && invalidCount === 0) return "";
  const parts: string[] = [];
  if (actionsCount > 0) {
    parts.push(`${actionsCount} action${actionsCount === 1 ? "" : "s"} executed`);
  }
  if (invalidCount > 0) {
    parts.push(`${invalidCount} skipped (unsupported)`);
  }
  return `\n\n_— Automator: ${parts.join(", ")}_`;
}

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
      console.error("[Automator] no editorState — skipping actions");
      return;
    }

    console.log(`[Automator] executing ${actions.length} action(s)`);
    let executed = 0;

    for (const actionItem of actions) {
      const executor = ACTION_REGISTRY[actionItem.action];
      if (!executor) {
        console.warn(`[Automator] unsupported action: ${actionItem.action}`);
        continue;
      }
      try {
        const params = buildExecuteParams(actionItem, editorStateRef.current);
        await executor.execute(params);
        executed++;
      } catch (err) {
        console.error(`[Automator] action "${actionItem.action}" failed:`, err);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[Automator] done: ${executed}/${actions.length} succeeded`);
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

      const actionsCount = response?.actions?.length ?? 0;
      const invalidCount = response?.automator?.invalidActionCount ?? 0;
      const footer = formatAutomatorFooter(actionsCount, invalidCount);

      await actions.addMessage(state.currentThreadId, {
        id: generateId(),
        role: "assistant",
        text: response.content + footer,
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

      if (response?.actions?.length) {
        performAction(response.actions);
      }

      const actionsCount = response?.actions?.length ?? 0;
      const invalidCount = response?.automator?.invalidActionCount ?? 0;
      const footer = formatAutomatorFooter(actionsCount, invalidCount);

      newMessages.push({
        id: generateId(),
        role: "assistant",
        text: response.content + footer,
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
