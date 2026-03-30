import React, { useMemo, useState } from "react";
import { Button, Input, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  GlobalOutlined,
  LockOutlined,
  LogoutOutlined,
  RobotOutlined,
  MailOutlined,
  UserAddOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ChatRoom, OnlineUser } from "../store";
import {
  RoomPanelContainer,
  RoomPanelHeader,
  RoomListContainer,
  RoomItemStyled,
  SearchResultBadge,
  LlmRoomBadge,
  OnlinePresenceSection,
  OnlinePresenceLabel,
  OnlineUserItem,
  OnlineAvatar,
  OnlineDot,
  OnlineUserName,
} from "../styles";
import { useChatBox } from "../ChatBoxContext";
import { trans } from "i18n";

export interface RoomPanelProps {
  onCreateModalOpen: () => void;
  onInviteModalOpen?: () => void;
}

export const RoomPanel = React.memo((props: RoomPanelProps) => {
  const { onCreateModalOpen, onInviteModalOpen } = props;
  const {
    rooms,
    currentRoomId,
    currentUserId,
    currentUserName,
    allowRoomCreation,
    allowRoomSearch,
    roomsPanelWidth,
    pendingInvites,
    onlineUsers,
    sidebarStyle,
    onRoomSwitch,
    onRoomJoin,
    onRoomLeave,
    onInviteAccept,
    onInviteDecline,
  } = useChatBox();

  // Users in the current room (from Pluv presence), plus self
  const roomOnlineUsers = useMemo<OnlineUser[]>(() => {
    const peers = onlineUsers.filter(
      (u) => u.currentRoomId === currentRoomId && u.userId !== currentUserId,
    );
    const self: OnlineUser = {
      userId: currentUserId,
      userName: currentUserName,
      currentRoomId,
    };
    return currentRoomId ? [self, ...peers] : peers;
  }, [onlineUsers, currentRoomId, currentUserId, currentUserName]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatRoom[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }
    setIsSearchMode(true);
    const lower = q.toLowerCase();
    setSearchResults(
      rooms.filter((r) => r.type === "public" && r.name.toLowerCase().includes(lower)),
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearchMode(false);
    setSearchResults([]);
  };

  const handleJoinAndClear = (roomId: string) => {
    onRoomJoin(roomId);
    clearSearch();
  };

  const roomListItems = isSearchMode ? searchResults : rooms;

  const publicRooms = roomListItems.filter((r) => r.type === "public");
  const privateRooms = roomListItems.filter((r) => r.type === "private");
  const llmRooms = roomListItems.filter((r) => r.type === "llm");

  const renderRoomItem = (room: ChatRoom) => {
    const isActive = currentRoomId === room.id;
    const isSearch = isSearchMode;

    return (
      <RoomItemStyled
        key={room.id}
        $active={isActive}
        $sidebarStyle={sidebarStyle}
        onClick={() => {
          if (isSearch) {
            handleJoinAndClear(room.id);
          } else if (!isActive) {
            onRoomSwitch(room.id);
          }
        }}
        title={isSearch ? trans("chatBoxV2.joinRoomTitle", { roomName: room.name }) : room.name}
      >
        {room.type === "llm" ? (
          <RobotOutlined
            style={{
              fontSize: 12,
              flexShrink: 0,
              color: isActive ? "#fff" : "#c084fc",
            }}
          />
        ) : room.type === "public" ? (
          <GlobalOutlined style={{ fontSize: 12, flexShrink: 0 }} />
        ) : (
          <LockOutlined style={{ fontSize: 12, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {room.name}
        </span>
        {room.type === "llm" && !isSearch && (
          <LlmRoomBadge
            style={
              isActive
                ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                : undefined
            }
          >
            {trans("chatBoxV2.aiShortLabel")}
          </LlmRoomBadge>
        )}
        {isSearch && <SearchResultBadge>{trans("chatBoxV2.joinAction")}</SearchResultBadge>}
        {isActive && !isSearch && (
          <Popconfirm
            title={trans("chatBoxV2.leaveRoomConfirm", { roomName: room.name })}
            onConfirm={(e) => {
              e?.stopPropagation();
              onRoomLeave(room.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText={trans("chatBoxV2.leaveAction")}
            cancelText={trans("chatBoxV2.cancelAction")}
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
  };

  return (
    <RoomPanelContainer $width={roomsPanelWidth} $sidebarStyle={sidebarStyle}>
      <RoomPanelHeader $sidebarStyle={sidebarStyle}>
        <span>{trans("chatBoxV2.roomsHeader")}</span>
        <div style={{ display: "flex", gap: 2 }}>
          {onInviteModalOpen && (
            <Tooltip title={trans("chatBoxV2.inviteUserToRoomTooltip")}>
              <Button
                type="text"
                size="small"
                icon={<UserAddOutlined />}
                onClick={onInviteModalOpen}
              />
            </Tooltip>
          )}
          {allowRoomCreation && (
            <Tooltip title={trans("chatBoxV2.createRoomTooltip")}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={onCreateModalOpen}
              />
            </Tooltip>
          )}
        </div>
      </RoomPanelHeader>

      {allowRoomSearch && (
        <div style={{ padding: "8px 8px 0" }}>
          <Input
            size="small"
            placeholder={trans("chatBoxV2.searchPublicRoomsPlaceholder")}
            prefix={<SearchOutlined style={{ color: "#aaa" }} />}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            onClear={clearSearch}
          />
        </div>
      )}

      {isSearchMode && (
        <div style={{ padding: "6px 8px 0", fontSize: 11, color: "#888" }}>
          {searchResults.length > 0
            ? trans(
                searchResults.length === 1
                  ? "chatBoxV2.searchResultsCountSingle"
                  : "chatBoxV2.searchResultsCountPlural",
                { count: searchResults.length },
              )
            : trans("chatBoxV2.noPublicRoomsMatch", { searchQuery })}
          <Button
            type="link"
            size="small"
            style={{ fontSize: 11, padding: 0, marginLeft: 4 }}
            onClick={clearSearch}
          >
            {trans("chatBoxV2.backAction")}
          </Button>
        </div>
      )}

      {/* Pending invites section */}
      {!isSearchMode && pendingInvites.length > 0 && (
        <div style={{ padding: "8px 8px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#666",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <MailOutlined />
            {trans("chatBoxV2.pendingInvitesHeader", { count: pendingInvites.length })}
          </div>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 8,
                marginBottom: 6,
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: 2,
                }}
              >
                <LockOutlined style={{ marginRight: 6, color: "#fa8c16" }} />
                {invite.roomName}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                {trans("chatBoxV2.invitedBy", { userName: invite.fromUserName })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onInviteAccept(invite.id)}
                >
                  {trans("chatBoxV2.acceptAction")}
                </Button>
                <Button size="small" onClick={() => onInviteDecline(invite.id)}>
                  {trans("chatBoxV2.declineAction")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <RoomListContainer>
        {roomListItems.length === 0 && !isSearchMode && (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: 12,
              padding: 16,
            }}
          >
            {allowRoomCreation
              ? trans("chatBoxV2.noRoomsYetCreateOne")
              : trans("chatBoxV2.noRoomsYet")}
          </div>
        )}

        {isSearchMode
          ? roomListItems.map(renderRoomItem)
          : (
            <>
              {llmRooms.length > 0 && (
                <>
                  <RoomSectionLabel label={trans("chatBoxV2.aiRoomsLabel")} />
                  {llmRooms.map(renderRoomItem)}
                </>
              )}
              {publicRooms.length > 0 && (
                <>
                  <RoomSectionLabel label={trans("chatBoxV2.publicRoomsLabel")} />
                  {publicRooms.map(renderRoomItem)}
                </>
              )}
              {privateRooms.length > 0 && (
                <>
                  <RoomSectionLabel label={trans("chatBoxV2.privateRoomsLabel")} />
                  {privateRooms.map(renderRoomItem)}
                </>
              )}
            </>
          )}
      </RoomListContainer>

      {/* ── Online Presence ─────────────────────────────────────── */}
      {currentRoomId && roomOnlineUsers.length > 0 && (
        <OnlinePresenceSection>
          <OnlinePresenceLabel>
            <TeamOutlined />
            {trans("chatBoxV2.onlinePresence", { count: roomOnlineUsers.length })}
          </OnlinePresenceLabel>
          {roomOnlineUsers.map((user) => (
            <OnlineUserItem key={user.userId}>
              <OnlineAvatar $color={avatarColor(user.userId)}>
                {(user.userName || user.userId).slice(0, 1).toUpperCase()}
                <OnlineDot />
              </OnlineAvatar>
              <OnlineUserName title={user.userName}>
                {user.userId === currentUserId
                  ? trans("chatBoxV2.userWithYou", { userName: user.userName })
                  : user.userName}
              </OnlineUserName>
            </OnlineUserItem>
          ))}
        </OnlinePresenceSection>
      )}
    </RoomPanelContainer>
  );
});

RoomPanel.displayName = "RoomPanel";

// ── Avatar color helper ───────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#1890ff", "#52c41a", "#fa8c16", "#722ed1",
  "#eb2f96", "#13c2c2", "#faad14", "#f5222d",
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// ── Section label ─────────────────────────────────────────────────────────────

const RoomSectionLabel = React.memo(({ label }: { label: string }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 600,
      color: "#aaa",
      letterSpacing: "0.6px",
      textTransform: "uppercase",
      padding: "8px 10px 4px",
    }}
  >
    {label}
  </div>
));

RoomSectionLabel.displayName = "RoomSectionLabel";
