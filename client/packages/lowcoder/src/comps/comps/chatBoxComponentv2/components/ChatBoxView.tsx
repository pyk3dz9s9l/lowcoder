import React, { useCallback, useEffect, useState } from "react";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import { useChatStore } from "../useChatStore";
import { Wrapper, ChatPanelContainer, ChatHeaderBar, ConnectionBanner, ConnectionDot } from "../styles";
import { RoomPanel } from "./RoomPanel";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";
import { CreateRoomModal } from "./CreateRoomModal";
import { LLM_BOT_AUTHOR_ID } from "../store";

type ChatBoxEventName = "messageSent" | "messageReceived" | "roomJoined" | "roomLeft" | "llmMessageReceived";

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
  systemPrompt: string;
  llmBotName: string;
  style: any;
  animationStyle: any;
  onEvent: (event: ChatBoxEventName) => any;
  onConversationHistoryChange: (history: any[]) => void;
  dispatch?: (...args: any[]) => void;
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
    systemPrompt,
    llmBotName,
    style,
    animationStyle,
    onEvent,
    onConversationHistoryChange,
    dispatch,
  } = props;

  const chat = useChatStore({
    applicationId: applicationId.value || "lowcoder_app",
    userId: userId.value || "user_1",
    userName: userName.value || "User",
    wsUrl: wsUrl || "ws://localhost:3005",
    dispatch,
    systemPrompt,
    llmBotName: llmBotName || "AI Assistant",
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const isLlmRoom = chat.currentRoom?.type === "llm";

  // ── Sync conversation history exposed state for LLM rooms ────────────────
  useEffect(() => {
    if (!isLlmRoom) return;
    const history = chat.messages
      .filter((m) => m.authorType === "user" || m.authorType === "assistant" || m.authorId === LLM_BOT_AUTHOR_ID)
      .map((m) => ({
        role: m.authorType === "assistant" || m.authorId === LLM_BOT_AUTHOR_ID ? "assistant" : "user",
        content: m.text,
        timestamp: m.timestamp,
        authorName: m.authorName,
      }));
    onConversationHistoryChange(history);
  }, [chat.messages, isLlmRoom, onConversationHistoryChange]);

  // ── Fire messageReceived event when a new AI message lands ───────────────
  const lastMessageRef = React.useRef<string | null>(null);
  useEffect(() => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.id === lastMessageRef.current) return;
    lastMessageRef.current = lastMsg.id;

    if (lastMsg.authorId === LLM_BOT_AUTHOR_ID || lastMsg.authorType === "assistant") {
      onEvent("llmMessageReceived");
      onEvent("messageReceived");
    }
  }, [chat.messages, onEvent]);

  // ── Room actions ──────────────────────────────────────────────────────────
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

  const handleSend = useCallback(
    async (text: string): Promise<boolean> => {
      const ok = await chat.sendMessage(text);
      return ok;
    },
    [chat.sendMessage],
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
            <div style={{ fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
              {chatName.value}
              {isLlmRoom && (
                <Tag
                  icon={<RobotOutlined />}
                  color="purple"
                  style={{ fontSize: 11, borderRadius: 6 }}
                >
                  AI Room
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              {chat.currentRoom?.name || "No room selected"}
              {chat.currentRoomMembers.length > 0 && (
                <span style={{ marginLeft: 8 }}>
                  <UserOutlined style={{ fontSize: 11, marginRight: 2 }} />
                  {chat.currentRoomMembers.length}
                </span>
              )}
              {isLlmRoom && chat.currentRoom?.llmQueryName && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#c084fc" }}>
                  ↳ {chat.currentRoom.llmQueryName}
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
          isLlmRoom={isLlmRoom}
          isLlmLoading={chat.isLlmLoading}
          llmBotName={llmBotName || "AI Assistant"}
        />

        <InputBar
          ready={chat.ready}
          currentRoom={chat.currentRoom}
          onSend={handleSend}
          onStartTyping={chat.startTyping}
          onStopTyping={chat.stopTyping}
          onMessageSentEvent={() => onEvent("messageSent")}
          isLlmLoading={chat.isLlmLoading}
          isLlmRoom={isLlmRoom}
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
