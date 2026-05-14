import { createContext, useContext } from "react";
import type { JSONObject } from "util/jsonTypes";
import type { ChatRoom, OnlineUser, PendingRoomInvite } from "./store";
import type {
  ChatBoxContainerStyleType,
  ChatBoxSidebarStyleType,
  ChatBoxHeaderStyleType,
  ChatBoxMessageStyleType,
  ChatBoxInputAreaStyleType,
  ChatBoxInputFieldStyleType,
  ChatBoxInputSendButtonStyleType,
  ChatBoxInputAttachButtonStyleType,
  AnimationStyleType,
} from "comps/controls/styleControlConstants";

type ChatEventName =
  | "messageSent"
  | "startTyping"
  | "stopTyping"
  | "roomSwitch"
  | "roomLeave"
  | "roomCreate"
  | "inviteSend"
  | "inviteAccept"
  | "inviteDecline"
  | "fileUpload";

interface ExposedState {
  value: string;
  onChange: (v: string) => void;
}

interface BooleanExposedState {
  value: boolean;
  onChange: (v: boolean) => void;
}

export interface ChatBoxContextValue {
  // Data
  messages: any[];
  rooms: ChatRoom[];
  currentRoomId: string;
  currentRoom: ChatRoom | null;
  currentUserId: string;
  currentUserName: string;
  typingUsers: any[];
  onlineUsers: OnlineUser[];
  pendingInvites: PendingRoomInvite[];
  isAiThinking: boolean;

  // Exposed state
  chatTitle: ExposedState;
  messageText: ExposedState;
  lastSentMessageText: ExposedState;
  /** True when the last sent message tagged the AI (`@[…](u:__llm_bot__)`). Use to gate LLM queries. */
  lastSentMessageTagsLlm: BooleanExposedState;

  // UI config
  showHeader: boolean;
  showRoomsPanel: boolean;
  roomsPanelWidth: string;
  allowRoomCreation: boolean;
  allowRoomSearch: boolean;
  style: ChatBoxContainerStyleType;
  animationStyle: AnimationStyleType;
  sidebarStyle: ChatBoxSidebarStyleType;
  headerStyle: ChatBoxHeaderStyleType;
  messageStyle: ChatBoxMessageStyleType;
  inputAreaStyle: ChatBoxInputAreaStyleType;
  inputFieldStyle: ChatBoxInputFieldStyleType;
  inputSendButtonStyle: ChatBoxInputSendButtonStyleType;
  inputAttachButtonStyle: ChatBoxInputAttachButtonStyleType;

  /** Message input attachments (same shape as File component `files`). */
  allowMessageFileUpload: boolean;
  maxMessageFiles: number;
  messageFileType: string[];
  messageFiles: JSONObject[];
  messageFileValues: Array<string | null>;
  setMessageAttachments: (files: JSONObject[], values: Array<string | null>) => void;
  clearMessageAttachments: () => void;
  onFileUploadEvent: () => void;

  // Events
  onEvent: (event: ChatEventName) => any;

  // Room actions
  onRoomSwitch: (roomId: string) => void;
  onRoomLeave: (roomId: string) => void;
  onRoomCreate: (
    name: string,
    type: "public" | "private" | "llm",
    description?: string,
    llmQueryName?: string,
  ) => void;
  onInviteSend: (toUserId: string) => void;
  onInviteAccept: (inviteId: string) => void;
  onInviteDecline: (inviteId: string) => void;
}

export const ChatBoxContext = createContext<ChatBoxContextValue | null>(null);

export function useChatBox(): ChatBoxContextValue {
  const ctx = useContext(ChatBoxContext);
  if (!ctx) {
    throw new Error("useChatBox must be used within a ChatBoxProvider");
  }
  return ctx;
}
