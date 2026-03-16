import React, { useState } from "react";
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
import { useChatBox } from "../ChatBoxContext";
import type { ChatRoom } from "../store";

export const ChatBoxView = React.memo(() => {
  const ctx = useChatBox();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const headerTitle = ctx.currentRoom
    ? ctx.currentRoom.name
    : ctx.chatTitle.value;

  return (
    <Wrapper $style={ctx.style} $anim={ctx.animationStyle}>
      {/* ── Rooms sidebar ───────────────────────────────────────── */}
      {ctx.showRoomsPanel && (
        <RoomPanel
          onCreateModalOpen={() => setCreateModalOpen(true)}
          onInviteModalOpen={
            ctx.currentRoom?.type === "private"
              ? () => setInviteModalOpen(true)
              : undefined
          }
        />
      )}

      {/* ── Chat area ───────────────────────────────────────────── */}
      <ChatPanelContainer>
        {ctx.showHeader && (
          <ChatHeaderBar>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {headerTitle}
            </div>
            {ctx.currentRoom?.description && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {ctx.currentRoom.description}
              </div>
            )}
          </ChatHeaderBar>
        )}

        <MessageList
          messages={ctx.messages}
          typingUsers={ctx.typingUsers}
          currentUserId={ctx.currentUserId}
        />

        <InputBar
          onSend={(text) => {
            ctx.lastSentMessageText.onChange(text);
            ctx.onEvent("messageSent");
          }}
          onStartTyping={() => ctx.onEvent("startTyping")}
          onStopTyping={() => ctx.onEvent("stopTyping")}
          onDraftChange={(text) => ctx.messageText.onChange(text)}
        />
      </ChatPanelContainer>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateRoom={async (name, type, description, llmQueryName) => {
          ctx.onRoomCreate(name, type, description, llmQueryName);
          const placeholder: ChatRoom = {
            id: "__pending__",
            name,
            type,
            description: description || null,
            members: [ctx.currentUserId],
            createdBy: ctx.currentUserId,
            createdAt: Date.now(),
            llmQueryName: llmQueryName || null,
          };
          return placeholder;
        }}
        onRoomCreatedEvent={() => {}}
      />

      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        currentRoom={ctx.currentRoom}
        onSendInvite={async (toUserId) => {
          ctx.onInviteSend(toUserId);
          return true;
        }}
      />
    </Wrapper>
  );
});

ChatBoxView.displayName = "ChatBoxV2View";
