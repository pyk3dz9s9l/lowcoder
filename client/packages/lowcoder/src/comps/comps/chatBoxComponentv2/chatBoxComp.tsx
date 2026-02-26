import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { Button, Input, Modal, Form, Radio, Space, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  LogoutOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { Section, sectionNames } from "lowcoder-design";
import { UICompBuilder, withDefault } from "../../generators";
import { NameConfig, NameConfigHidden, withExposingConfigs } from "../../generators/withExposing";
import { withMethodExposing } from "../../generators/withMethodExposing";
import { stringExposingStateControl } from "comps/controls/codeStateControl";
import { BoolControl } from "comps/controls/boolControl";
import { StringControl } from "comps/controls/codeControl";
import { dropdownControl } from "comps/controls/dropdownControl";
import { AutoHeightControl } from "comps/controls/autoHeightControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { styleControl } from "comps/controls/styleControl";
import { AnimationStyle, TextStyle, TextStyleType, AnimationStyleType } from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";
import { trans } from "i18n";

import { useChatStore } from "./useChatStore";
import type { ChatMessage, ChatRoom, RoomMember } from "./chatDataStore";

// ─── Event definitions ──────────────────────────────────────────────────────

const ChatEvents = [
  { label: trans("chatBox.messageSent"), value: "messageSent", description: trans("chatBox.messageSentDesc") },
  { label: trans("chatBox.messageReceived"), value: "messageReceived", description: trans("chatBox.messageReceivedDesc") },
  { label: trans("chatBox.roomJoined"), value: "roomJoined", description: trans("chatBox.roomJoinedDesc") },
  { label: trans("chatBox.roomLeft"), value: "roomLeft", description: trans("chatBox.roomLeftDesc") },
] as const;

// ─── Children map (component properties) ────────────────────────────────────

const childrenMap = {
  chatName: stringExposingStateControl("chatName", "Chat Room"),
  userId: stringExposingStateControl("userId", "user_1"),
  userName: stringExposingStateControl("userName", "User"),
  applicationId: stringExposingStateControl("applicationId", "lowcoder_app"),
  defaultRoom: withDefault(StringControl, "general"),

  allowRoomCreation: withDefault(BoolControl, true),
  allowRoomSearch: withDefault(BoolControl, true),
  showRoomPanel: withDefault(BoolControl, true),
  roomPanelWidth: withDefault(StringControl, "220px"),

  autoHeight: AutoHeightControl,
  onEvent: eventHandlerControl(ChatEvents),
  style: styleControl(TextStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
};

// ─── Styled components ──────────────────────────────────────────────────────

const Wrapper = styled.div<{ $style: TextStyleType; $anim: AnimationStyleType }>`
  height: 100%;
  display: flex;
  overflow: hidden;
  border-radius: ${(p) => p.$style.radius || "8px"};
  border: ${(p) => p.$style.borderWidth || "1px"} solid ${(p) => p.$style.border || "#e0e0e0"};
  background: ${(p) => p.$style.background || "#fff"};
  font-family: ${(p) => p.$style.fontFamily || "inherit"};
  ${(p) => p.$anim}
`;

const RoomPanel = styled.div<{ $width: string }>`
  width: ${(p) => p.$width};
  min-width: 160px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
`;

const RoomPanelHeader = styled.div`
  padding: 12px;
  font-weight: 600;
  font-size: 13px;
  color: #555;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RoomList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const RoomItemStyled = styled.div<{ $active: boolean }>`
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(p) => (p.$active ? "#1890ff" : "#fff")};
  color: ${(p) => (p.$active ? "#fff" : "#333")};
  border: 1px solid ${(p) => (p.$active ? "#1890ff" : "#f0f0f0")};

  &:hover {
    background: ${(p) => (p.$active ? "#1890ff" : "#f5f5f5")};
  }
`;

const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const ChatHeaderBar = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Bubble = styled.div<{ $own: boolean }>`
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  align-self: ${(p) => (p.$own ? "flex-end" : "flex-start")};
  background: ${(p) => (p.$own ? "#1890ff" : "#f0f0f0")};
  color: ${(p) => (p.$own ? "#fff" : "#333")};
  font-size: 14px;
  word-break: break-word;
`;

const BubbleMeta = styled.div<{ $own: boolean }>`
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 2px;
  text-align: ${(p) => (p.$own ? "right" : "left")};
`;

const BubbleTime = styled.div<{ $own: boolean }>`
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
  text-align: ${(p) => (p.$own ? "right" : "left")};
`;

const InputBar = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

const StyledTextArea = styled.textarea`
  flex: 1;
  padding: 8px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 18px;
  resize: none;
  min-height: 36px;
  max-height: 96px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  &:focus {
    border-color: #1890ff;
  }
`;

const EmptyChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 4px;
`;

const SearchResultBadge = styled.span`
  font-size: 10px;
  background: #e6f7ff;
  color: #1890ff;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 500;
  margin-left: auto;
`;

// ─── View component ─────────────────────────────────────────────────────────

const ChatBoxView = React.memo((props: any) => {
  const {
    chatName,
    userId,
    userName,
    applicationId,
    defaultRoom,
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
    defaultRoom: defaultRoom || "general",
    userId: userId.value || "user_1",
    userName: userName.value || "User",
  });

  const [draft, setDraft] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatRoom[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [createForm] = Form.useForm();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    const ok = await chat.sendMessage(draft);
    if (ok) {
      setDraft("");
      onEvent("messageSent");
    }
  }, [draft, chat.sendMessage, onEvent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleCreateRoom = useCallback(
    async (values: { roomName: string; roomType: "public" | "private"; description?: string }) => {
      const room = await chat.createRoom(values.roomName.trim(), values.roomType, values.description);
      if (room) {
        createForm.resetFields();
        setCreateModalOpen(false);
        onEvent("roomJoined");
      }
    },
    [chat.createRoom, createForm, onEvent],
  );

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      const ok = await chat.joinRoom(roomId);
      if (ok) {
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchMode(false);
        onEvent("roomJoined");
      }
    },
    [chat.joinRoom, onEvent],
  );

  const handleLeaveRoom = useCallback(
    async (roomId: string) => {
      const ok = await chat.leaveRoom(roomId);
      if (ok) onEvent("roomLeft");
    },
    [chat.leaveRoom, onEvent],
  );

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        return;
      }
      setIsSearchMode(true);
      const results = await chat.searchRooms(q);
      setSearchResults(results);
    },
    [chat.searchRooms],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  const roomListItems = isSearchMode ? searchResults : chat.userRooms;

  return (
    <Wrapper $style={style} $anim={animationStyle}>
      {/* Room Panel */}
      {showRoomPanel && (
        <RoomPanel $width={roomPanelWidth}>
          <RoomPanelHeader>
            <span>Rooms</span>
            {allowRoomCreation && (
              <Tooltip title="Create room">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalOpen(true)}
                />
              </Tooltip>
            )}
          </RoomPanelHeader>

          {/* Search */}
          {allowRoomSearch && (
            <div style={{ padding: "8px 8px 0" }}>
              <Input
                size="small"
                placeholder="Search public rooms..."
                prefix={<SearchOutlined style={{ color: "#aaa" }} />}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                onClear={() => {
                  setSearchQuery("");
                  setIsSearchMode(false);
                  setSearchResults([]);
                }}
              />
            </div>
          )}

          {isSearchMode && (
            <div style={{ padding: "6px 8px 0", fontSize: 11, color: "#888" }}>
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length > 1 ? "s" : ""}`
                : `No public rooms match "${searchQuery}"`}
              <Button
                type="link"
                size="small"
                style={{ fontSize: 11, padding: 0, marginLeft: 4 }}
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchMode(false);
                  setSearchResults([]);
                }}
              >
                Back
              </Button>
            </div>
          )}

          <RoomList>
            {roomListItems.length === 0 && !isSearchMode && chat.ready && (
              <div style={{ textAlign: "center", color: "#999", fontSize: 12, padding: 16 }}>
                No rooms yet. Create or search for one.
              </div>
            )}

            {roomListItems.map((room) => {
              const isActive = chat.currentRoom?.id === room.id;
              const isSearch = isSearchMode;

              return (
                <RoomItemStyled
                  key={room.id}
                  $active={isActive}
                  onClick={() => {
                    if (isSearch) {
                      handleJoinRoom(room.id);
                    } else if (!isActive) {
                      chat.switchRoom(room.id);
                    }
                  }}
                  title={isSearch ? `Join "${room.name}"` : room.name}
                >
                  {room.type === "public" ? (
                    <GlobalOutlined style={{ fontSize: 12, flexShrink: 0 }} />
                  ) : (
                    <LockOutlined style={{ fontSize: 12, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {room.name}
                  </span>
                  {isSearch && <SearchResultBadge>Join</SearchResultBadge>}
                  {isActive && !isSearch && (
                    <Popconfirm
                      title={`Leave "${room.name}"?`}
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleLeaveRoom(room.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="Leave"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <LogoutOutlined
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12, opacity: 0.7 }}
                      />
                    </Popconfirm>
                  )}
                </RoomItemStyled>
              );
            })}
          </RoomList>
        </RoomPanel>
      )}

      {/* Chat Panel */}
      <ChatPanel>
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
          <div style={{ fontSize: 12, color: chat.ready ? "#52c41a" : "#999" }}>
            {chat.ready ? "Connected" : chat.error || "Connecting..."}
          </div>
        </ChatHeaderBar>

        <MessagesArea>
          {chat.messages.length === 0 ? (
            <EmptyChat>
              <div style={{ fontSize: 24 }}>💬</div>
              <div>No messages yet</div>
              <div style={{ fontSize: 12 }}>
                {chat.ready ? "Start the conversation!" : "Connecting..."}
              </div>
            </EmptyChat>
          ) : (
            chat.messages.map((msg: ChatMessage) => {
              const isOwn = msg.authorId === userId.value;
              return (
                <div key={msg.id}>
                  <BubbleMeta $own={isOwn}>{msg.authorName}</BubbleMeta>
                  <Bubble $own={isOwn}>{msg.text}</Bubble>
                  <BubbleTime $own={isOwn}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </BubbleTime>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </MessagesArea>

        <InputBar>
          <StyledTextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chat.ready ? "Type a message..." : "Connecting..."}
            disabled={!chat.ready || !chat.currentRoom}
            rows={1}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!draft.trim() || !chat.ready || !chat.currentRoom}
          />
        </InputBar>
      </ChatPanel>

      {/* Create Room Modal */}
      <Modal
        title="Create Room"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        width={420}
        centered
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateRoom}
          initialValues={{ roomType: "public" }}
        >
          <Form.Item
            name="roomName"
            label="Room Name"
            rules={[
              { required: true, message: "Room name is required" },
              { min: 2, message: "At least 2 characters" },
              { max: 50, message: "At most 50 characters" },
            ]}
          >
            <Input placeholder="e.g. Design Team" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="What is this room about?" rows={2} />
          </Form.Item>
          <Form.Item name="roomType" label="Visibility">
            <Radio.Group>
              <Radio value="public">
                <GlobalOutlined style={{ color: "#52c41a", marginRight: 4 }} /> Public
              </Radio>
              <Radio value="private">
                <LockOutlined style={{ color: "#fa8c16", marginRight: 4 }} /> Private
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => { setCreateModalOpen(false); createForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Create</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Wrapper>
  );
});

ChatBoxView.displayName = "ChatBoxV2View";

// ─── Property panel ─────────────────────────────────────────────────────────

const ChatBoxPropertyView = React.memo((props: { children: any }) => {
  const { children } = props;
  const editorMode = useContext(EditorContext).editorModeStatus;

  return (
    <>
      <Section name={sectionNames.basic}>
        {children.chatName.propertyView({ label: "Chat Name", tooltip: "Display name for the chat header" })}
        {children.userId.propertyView({ label: "User ID", tooltip: "Current user's unique identifier" })}
        {children.userName.propertyView({ label: "User Name", tooltip: "Current user's display name" })}
        {children.applicationId.propertyView({ label: "Application ID", tooltip: "Scopes rooms to this application" })}
        {children.defaultRoom.propertyView({ label: "Default Room", tooltip: "Room to join on load" })}
      </Section>

      <Section name="Room Settings">
        {children.allowRoomCreation.propertyView({ label: "Allow Room Creation" })}
        {children.allowRoomSearch.propertyView({ label: "Allow Room Search" })}
        {children.showRoomPanel.propertyView({ label: "Show Room Panel" })}
        {children.roomPanelWidth.propertyView({ label: "Panel Width", tooltip: "e.g. 220px or 25%" })}
      </Section>

      {["logic", "both"].includes(editorMode) && (
        <Section name={sectionNames.interaction}>
          {hiddenPropertyView(children)}
          {children.onEvent.getPropertyView()}
        </Section>
      )}

      {["layout", "both"].includes(editorMode) && (
        <>
          <Section name={sectionNames.layout}>
            {children.autoHeight.getPropertyView()}
          </Section>
          <Section name={sectionNames.style}>
            {children.style.getPropertyView()}
          </Section>
          <Section name={sectionNames.animationStyle} hasTooltip={true}>
            {children.animationStyle.getPropertyView()}
          </Section>
        </>
      )}
    </>
  );
});

ChatBoxPropertyView.displayName = "ChatBoxV2PropertyView";

// ─── Build component ────────────────────────────────────────────────────────

let ChatBoxV2Tmp = (function () {
  return new UICompBuilder(childrenMap, (props) => <ChatBoxView {...props} />)
    .setPropertyViewFn((children) => <ChatBoxPropertyView children={children} />)
    .build();
})();

ChatBoxV2Tmp = class extends ChatBoxV2Tmp {
  override autoHeight(): boolean {
    return this.children.autoHeight.getView();
  }
};

// ─── Methods ────────────────────────────────────────────────────────────────

ChatBoxV2Tmp = withMethodExposing(ChatBoxV2Tmp, [
  {
    method: {
      name: "setUser",
      description: "Update the current chat user",
      params: [
        { name: "userId", type: "string" },
        { name: "userName", type: "string" },
      ],
    },
    execute: (comp: any, values: any[]) => {
      if (values[0]) comp.children.userId.getView().onChange(values[0]);
      if (values[1]) comp.children.userName.getView().onChange(values[1]);
    },
  },
]);

// ─── Exposing configs ───────────────────────────────────────────────────────

export const ChatBoxV2Comp = withExposingConfigs(ChatBoxV2Tmp, [
  new NameConfig("chatName", "Chat display name"),
  new NameConfig("userId", "Current user ID"),
  new NameConfig("userName", "Current user name"),
  new NameConfig("applicationId", "Application scope"),
  NameConfigHidden,
]);
