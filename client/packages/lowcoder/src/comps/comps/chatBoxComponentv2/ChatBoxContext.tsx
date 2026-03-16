import { createContext, useContext } from "react";
import type { ChatRoom, PendingRoomInvite } from "./store";

type ChatEventName =
  | "messageSent"
  | "startTyping"
  | "stopTyping"
  | "roomSwitch"
  | "roomJoin"
  | "roomLeave"
  | "roomCreate"
  | "inviteSend"
  | "inviteAccept"
  | "inviteDecline";

interface ExposedState {
  value: string;
  onChange: (v: string) => void;
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
  pendingInvites: PendingRoomInvite[];

  // Exposed state
  chatTitle: ExposedState;
  messageText: ExposedState;
  lastSentMessageText: ExposedState;

  // UI config
  showHeader: boolean;
  showRoomsPanel: boolean;
  roomsPanelWidth: string;
  allowRoomCreation: boolean;
  allowRoomSearch: boolean;
  style: any;
  animationStyle: any;

  // Events
  onEvent: (event: ChatEventName) => any;

  // Room actions
  onRoomSwitch: (roomId: string) => void;
  onRoomJoin: (roomId: string) => void;
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
