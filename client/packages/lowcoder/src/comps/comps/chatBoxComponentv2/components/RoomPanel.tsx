import React, { useCallback, useState } from "react";
import { Button, Input, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  GlobalOutlined,
  LockOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import type { ChatRoom } from "../store";
import {
  RoomPanelContainer,
  RoomPanelHeader,
  RoomListContainer,
  RoomItemStyled,
  SearchResultBadge,
} from "../styles";

export interface RoomPanelProps {
  width: string;
  rooms: ChatRoom[];
  currentRoomId: string | undefined;
  ready: boolean;
  allowRoomCreation: boolean;
  allowRoomSearch: boolean;
  onSwitchRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onSearchRooms: (query: string) => Promise<ChatRoom[]>;
  onCreateModalOpen: () => void;
}

export const RoomPanel = React.memo((props: RoomPanelProps) => {
  const {
    width,
    rooms,
    currentRoomId,
    ready,
    allowRoomCreation,
    allowRoomSearch,
    onSwitchRoom,
    onJoinRoom,
    onLeaveRoom,
    onSearchRooms,
    onCreateModalOpen,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatRoom[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim()) {
        setIsSearchMode(false);
        setSearchResults([]);
        return;
      }
      setIsSearchMode(true);
      const results = await onSearchRooms(q);
      setSearchResults(results);
    },
    [onSearchRooms],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearchMode(false);
    setSearchResults([]);
  }, []);

  const handleJoinAndClear = useCallback(
    (roomId: string) => {
      onJoinRoom(roomId);
      clearSearch();
    },
    [onJoinRoom, clearSearch],
  );

  const roomListItems = isSearchMode ? searchResults : rooms;

  return (
    <RoomPanelContainer $width={width}>
      <RoomPanelHeader>
        <span>Rooms</span>
        {allowRoomCreation && (
          <Tooltip title="Create room">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={onCreateModalOpen}
            />
          </Tooltip>
        )}
      </RoomPanelHeader>

      {allowRoomSearch && (
        <div style={{ padding: "8px 8px 0" }}>
          <Input
            size="small"
            placeholder="Search public rooms..."
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
            ? `${searchResults.length} result${searchResults.length > 1 ? "s" : ""}`
            : `No public rooms match "${searchQuery}"`}
          <Button
            type="link"
            size="small"
            style={{ fontSize: 11, padding: 0, marginLeft: 4 }}
            onClick={clearSearch}
          >
            Back
          </Button>
        </div>
      )}

      <RoomListContainer>
        {roomListItems.length === 0 && !isSearchMode && ready && (
          <div style={{ textAlign: "center", color: "#999", fontSize: 12, padding: 16 }}>
            No rooms yet. Create or search for one.
          </div>
        )}

        {roomListItems.map((room) => {
          const isActive = currentRoomId === room.id;
          const isSearch = isSearchMode;

          return (
            <RoomItemStyled
              key={room.id}
              $active={isActive}
              onClick={() => {
                if (isSearch) {
                  handleJoinAndClear(room.id);
                } else if (!isActive) {
                  onSwitchRoom(room.id);
                }
              }}
              title={isSearch ? `Join "${room.name}"` : room.name}
            >
              {room.type === "public" ? (
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
              {isSearch && <SearchResultBadge>Join</SearchResultBadge>}
              {isActive && !isSearch && (
                <Popconfirm
                  title={`Leave "${room.name}"?`}
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    onLeaveRoom(room.id);
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
      </RoomListContainer>
    </RoomPanelContainer>
  );
});

RoomPanel.displayName = "RoomPanel";
