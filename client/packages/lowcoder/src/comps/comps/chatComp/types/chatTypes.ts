import { CompleteAttachment } from "@assistant-ui/react";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: number;
    attachments?: CompleteAttachment[];
  }
  
  export interface ChatThread {
    threadId: string;
    status: "regular" | "archived";
    title: string;
    createdAt: number;
    updatedAt: number;
  }
  
  // ============================================================================
  // STORAGE INTERFACE (abstracted from your existing storage factory)
  // ============================================================================
  
  export interface ChatStorage {
    initialize(): Promise<void>;
    saveThread(thread: ChatThread): Promise<void>;
    getThread(threadId: string): Promise<ChatThread | null>;
    getAllThreads(): Promise<ChatThread[]>;
    deleteThread(threadId: string): Promise<void>;
    saveMessage(message: ChatMessage, threadId: string): Promise<void>;
    saveMessages(messages: ChatMessage[], threadId: string): Promise<void>;
    getMessages(threadId: string): Promise<ChatMessage[]>;
    deleteMessages(threadId: string): Promise<void>;
    clearAllData(): Promise<void>;
    resetDatabase(): Promise<void>;
    cleanup(): Promise<void>;
  }
  
  // ============================================================================
  // MESSAGE HANDLER INTERFACE (new clean abstraction)
  // ============================================================================
  
  export interface MessageHandler {
    sendMessage(message: ChatMessage, sessionId?: string): Promise<MessageResponse>;
    // Future: sendMessageStream?(message: ChatMessage): AsyncGenerator<MessageResponse>;
  }

  export interface AIAssistantMessageHandler {
    sendMessage(message: ChatMessage, sessionId?: string, conversationHistory?: ChatMessage[]): Promise<MessageResponse>;
  }
  
  export interface MessageResponse {
    content: string;
    metadata?: any;
    actions?: any[];
    /**
     * When the Automator parses a structured `{explanation, actions}` reply
     * we surface the parsed payload here so the UI / downstream consumers
     * can show extra context (e.g. "3 actions scheduled").
     */
    automator?: {
      isStructured: boolean;
      explanation: string;
      invalidActionCount: number;
    };
  }
  
  // ============================================================================
  // CONFIGURATION TYPES (simplified)
  // ============================================================================
  
  export interface QueryHandlerConfig {
    chatQuery: string;
    dispatch: any;
    /**
     * Snapshot accessor for the live editor state. The handler calls this
     * lazily on every send so it always has the *current* canvas state.
     * Optional — when missing the Automator falls back to a context-less
     * passthrough (legacy behaviour).
     */
    getEditorState?: () => any;
    /**
     * When false, the handler skips injecting the Automator system prompt
     * and just forwards `messages` (the conversation history) as-is. Useful
     * for plain ChatGPT-style queries that don't drive the canvas.
     */
    enableAutomator?: boolean;
  }
  
// ============================================================================
// COMPONENT PROPS (what each component actually needs)
// ============================================================================

// Main Chat Component Props (with full styling support)
export interface ChatCoreProps {
  messageHandler: MessageHandler;
  placeholder?: string;
  autoHeight?: boolean;
  sidebarWidth?: string;
  onMessageUpdate?: (message: string) => void;
  onConversationUpdate?: (conversationHistory: ChatMessage[]) => void;
  // STANDARD LOWCODER EVENT PATTERN - SINGLE CALLBACK
  onEvent?: (eventName: string) => void;
  // Style controls (only for main component)
  style?: any;
  sidebarStyle?: any;
  messagesStyle?: any;
  inputStyle?: any;
  sendButtonStyle?: any;
  newThreadButtonStyle?: any;
  threadItemStyle?: any;
  animationStyle?: any;
}

// Bottom Panel Props (simplified, no styling controls)
export interface ChatPanelProps {
  tableName: string;
  chatQuery: string;
  onMessageUpdate?: (message: string) => void;
}
