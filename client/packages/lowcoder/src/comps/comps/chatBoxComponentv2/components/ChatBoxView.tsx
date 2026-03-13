import React, { useCallback, useMemo, useState } from "react";
import {
  Wrapper,
  ChatPanelContainer,
  ChatHeaderBar,
} from "../styles";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { RoomPanel } from "./RoomPanel";
import { CreateRoomModal } from "./CreateRoomModal";
import { InviteUserModal } from "./InviteUserModal";
import type { ChatRoom, PendingRoomInvite } from "../store";

export interface ChatBoxViewProps {
  chatTitle: { value: string; onChange: (v: string) => void };
  showHeader: boolean;
  messages: any;
  currentUserId: string;
  currentUserName: string;
  typingUsers: any;
  lastSentMessageText: { value: string; onChange: (v: string) => void };
  messageText: { value: string; onChange: (v: string) => void };
  style: any;
  animationStyle: any;
  onEvent: (
    event:
      | "messageSent"
      | "startTyping"
      | "stopTyping"
      | "roomSwitch"
      | "roomJoin"
      | "roomLeave"
      | "roomCreate"
      | "inviteSend"
      | "inviteAccept"
      | "inviteDecline",
  ) => any;

  // Rooms panel
  rooms: any;
  currentRoomId: string;
  pendingInvites: any;
  showRoomsPanel: boolean;
  roomsPanelWidth: string;
  allowRoomCreation: boolean;
  allowRoomSearch: boolean;

  // Interaction callbacks
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

export const ChatBoxView = React.memo((props: ChatBoxViewProps) => {
  const {
    chatTitle,
    showHeader,
    messages,
    currentUserId,
    typingUsers,
    lastSentMessageText,
    messageText,
    style,
    animationStyle,
    onEvent,
    rooms,
    currentRoomId,
    pendingInvites,
    showRoomsPanel,
    roomsPanelWidth,
    allowRoomCreation,
    allowRoomSearch,
    onRoomSwitch,
    onRoomJoin,
    onRoomLeave,
    onRoomCreate,
    onInviteSend,
    onInviteAccept,
    onInviteDecline,
  } = props;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const normalizedTypingUsers = Array.isArray(typingUsers) ? typingUsers : [];
  const normalizedRooms = Array.isArray(rooms) ? (rooms as ChatRoom[]) : [];
  const normalizedInvites = Array.isArray(pendingInvites)
    ? (pendingInvites as PendingRoomInvite[])
    : [];

  // ── Current room object ────────────────────────────────────────────
  const currentRoom = useMemo(
    () => normalizedRooms.find((r) => r.id === currentRoomId) ?? null,
    [normalizedRooms, currentRoomId],
  );

  // ── Message handlers ───────────────────────────────────────────────
  const handleSend = useCallback(
    (text: string) => {
      lastSentMessageText.onChange(text);
      onEvent("messageSent");
    },
    [lastSentMessageText, onEvent],
  );

  const handleStartTyping = useCallback(() => {
    onEvent("startTyping");
  }, [onEvent]);

  const handleStopTyping = useCallback(() => {
    onEvent("stopTyping");
  }, [onEvent]);

  const handleDraftChange = useCallback(
    (text: string) => {
      messageText.onChange(text);
    },
    [messageText],
  );

  // ── Room panel handlers ────────────────────────────────────────────
  const handleSwitchRoom = useCallback(
    (roomId: string) => {
      onRoomSwitch(roomId);
    },
    [onRoomSwitch],
  );

  const handleJoinRoom = useCallback(
    (roomId: string) => {
      onRoomJoin(roomId);
    },
    [onRoomJoin],
  );

  const handleLeaveRoom = useCallback(
    (roomId: string) => {
      onRoomLeave(roomId);
    },
    [onRoomLeave],
  );

  // Client-side search: public rooms matching query
  const handleSearchRooms = useCallback(
    async (query: string): Promise<ChatRoom[]> => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return normalizedRooms.filter(
        (r) => r.type === "public" && r.name.toLowerCase().includes(q),
      );
    },
    [normalizedRooms],
  );

  // ── Create room modal ──────────────────────────────────────────────
  const handleCreateRoom = useCallback(
    async (
      name: string,
      type: "public" | "private" | "llm",
      description?: string,
      llmQueryName?: string,
    ): Promise<ChatRoom | null> => {
      onRoomCreate(name, type, description, llmQueryName);
      // Return a placeholder so the modal closes immediately;
      // the real room will appear via the controller's Pluv sync.
      const placeholder: ChatRoom = {
        id: "__pending__",
        name,
        type,
        description: description || null,
        members: [currentUserId],
        createdBy: currentUserId,
        createdAt: Date.now(),
        llmQueryName: llmQueryName || null,
      };
      return placeholder;
    },
    [onRoomCreate, currentUserId],
  );

  // ── Invite modal handlers ──────────────────────────────────────────
  const handleSendInvite = useCallback(
    async (toUserId: string): Promise<boolean> => {
      onInviteSend(toUserId);
      return true;
    },
    [onInviteSend],
  );

  // ── Derive chat header label ───────────────────────────────────────
  const headerTitle = currentRoom
    ? currentRoom.name
    : chatTitle.value;

  return (
    <Wrapper $style={style} $anim={animationStyle}>
      {/* ── Rooms sidebar ───────────────────────────────────────── */}
      {showRoomsPanel && (
        <RoomPanel
          width={roomsPanelWidth}
          rooms={normalizedRooms}
          currentRoomId={currentRoomId || undefined}
          ready={true}
          allowRoomCreation={allowRoomCreation}
          allowRoomSearch={allowRoomSearch}
          onSwitchRoom={handleSwitchRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onSearchRooms={handleSearchRooms}
          pendingInvites={normalizedInvites}
          onAcceptInvite={(id) => onInviteAccept(id)}
          onDeclineInvite={(id) => onInviteDecline(id)}
          onCreateModalOpen={() => setCreateModalOpen(true)}
          onInviteModalOpen={
            currentRoom?.type === "private"
              ? () => setInviteModalOpen(true)
              : undefined
          }
        />
      )}

      {/* ── Chat area ───────────────────────────────────────────── */}
      <ChatPanelContainer>
        {showHeader && (
          <ChatHeaderBar>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {headerTitle}
            </div>
            {currentRoom?.description && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {currentRoom.description}
              </div>
            )}
          </ChatHeaderBar>
        )}

        <MessageList
          messages={normalizedMessages}
          typingUsers={normalizedTypingUsers}
          currentUserId={currentUserId}
        />

        <InputBar
          onSend={handleSend}
          onStartTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          onDraftChange={handleDraftChange}
        />
      </ChatPanelContainer>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onRoomCreatedEvent={() => {/* event already fired inside handleCreateRoom */}}
      />

      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        currentRoom={currentRoom}
        onSendInvite={handleSendInvite}
      />
    </Wrapper>
  );
});

ChatBoxView.displayName = "ChatBoxV2View";
