import React, { useCallback, useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import { useChatStore } from "../useChatStore";
import { Wrapper, ChatPanelContainer, ChatHeaderBar, ConnectionBanner, ConnectionDot } from "../styles";
import { RoomPanel } from "./RoomPanel";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { CreateRoomModal } from "./CreateRoomModal";

type ChatBoxEventName = "messageSent" | "messageReceived" | "roomJoined" | "roomLeft";

export interface ChatBoxViewProps {
  chatName: { value: string };
  userId: { value: string };
  userName: { value: string };
  applicationId: { value: string };
  wsUrl: string;
  allowRoomCreation: boolean;
  allowRoomSearch: boolean;
  showRoomPanel: boolean;
  roomPanelWidth: string;
  style: any;
  animationStyle: any;
  onEvent: (event: ChatBoxEventName) => any;
  [key: string]: any;
}

function connectionStatus(ready: boolean, label: string): "online" | "offline" | "connecting" {
  if (!ready) return "connecting";
  if (label.includes("Online") || label === "Local") return "online";
  return "offline";
}

export const ChatBoxView = React.memo((props: ChatBoxViewProps) => {
  const {
    chatName,
    userId,
    userName,
    applicationId,
    wsUrl,
    allowRoomCreation,
    allowRoomSearch,
    showRoomPanel,
    roomPanelWidth,
    style,
    animationStyle,
    onEvent,
  } = props;

  const chat = useChatStore({
    applicationId: applicationId.value || "lowcoder_app",
    userId: userId.value || "user_1",
    userName: userName.value || "User",
    wsUrl: wsUrl || "ws://localhost:3005",
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleLeaveRoom = useCallback(
    async (roomId: string) => {
      const ok = await chat.leaveRoom(roomId);
      if (ok) onEvent("roomLeft");
    },
    [chat.leaveRoom, onEvent],
  );

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      const ok = await chat.joinRoom(roomId);
      if (ok) onEvent("roomJoined");
    },
    [chat.joinRoom, onEvent],
  );

  const status = connectionStatus(chat.ready, chat.connectionLabel);

  return (
    <Wrapper $style={style} $anim={animationStyle}>
      {showRoomPanel && (
        <RoomPanel
          width={roomPanelWidth}
          rooms={chat.userRooms}
          currentRoomId={chat.currentRoom?.id}
          ready={chat.ready}
          allowRoomCreation={allowRoomCreation}
          allowRoomSearch={allowRoomSearch}
          onSwitchRoom={chat.switchRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onSearchRooms={chat.searchRooms}
          onCreateModalOpen={() => setCreateModalOpen(true)}
        />
      )}

      <ChatPanelContainer>
        <ChatHeaderBar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{chatName.value}</div>
            <div style={{ fontSize: 13, color: "#888" }}>
              {chat.currentRoom?.name || "No room selected"}
              {chat.currentRoomMembers.length > 0 && (
                <span style={{ marginLeft: 8 }}>
                  <UserOutlined style={{ fontSize: 11, marginRight: 2 }} />
                  {chat.currentRoomMembers.length}
                </span>
              )}
            </div>
          </div>
          <ConnectionBanner $status={status}>
            <ConnectionDot $status={status} />
            {chat.ready ? chat.connectionLabel : chat.error || "Connecting..."}
          </ConnectionBanner>
        </ChatHeaderBar>

        <MessageList
          messages={chat.messages}
          typingUsers={chat.typingUsers}
          currentUserId={userId.value}
          ready={chat.ready}
        />

        <InputBar
          ready={chat.ready}
          currentRoom={chat.currentRoom}
          onSend={chat.sendMessage}
          onStartTyping={chat.startTyping}
          onStopTyping={chat.stopTyping}
          onMessageSentEvent={() => onEvent("messageSent")}
        />
      </ChatPanelContainer>

      <CreateRoomModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateRoom={chat.createRoom}
        onRoomCreatedEvent={() => onEvent("roomJoined")}
      />
    </Wrapper>
  );
});

ChatBoxView.displayName = "ChatBoxV2View";
