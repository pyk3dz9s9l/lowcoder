import React, { useContext } from "react";
import { Section, sectionNames } from "lowcoder-design";
import { UICompBuilder, withDefault } from "../../generators";
import {
  NameConfig,
  NameConfigHidden,
  withExposingConfigs,
} from "../../generators/withExposing";
import { stringExposingStateControl } from "comps/controls/codeStateControl";
import { BoolControl } from "comps/controls/boolControl";
import { StringControl, jsonArrayControl } from "comps/controls/codeControl";
import { AutoHeightControl } from "comps/controls/autoHeightControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { styleControl } from "comps/controls/styleControl";
import {
  AnimationStyle,
  TextStyle,
} from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";

import { ChatBoxView } from "./components/ChatBoxView";
import { ChatBoxContext } from "./ChatBoxContext";
import type { ChatRoom, PendingRoomInvite } from "./store";

// ─── Events ──────────────────────────────────────────────────────────────────

const ChatEvents = [
  {
    label: "Message Sent",
    value: "messageSent",
    description:
      "Triggered when the user presses send. Read chatBox.lastSentMessageText to get the message content.",
  },
  {
    label: "Start Typing",
    value: "startTyping",
    description:
      "Triggered when the user starts typing. Wire this to chatController.startTyping().",
  },
  {
    label: "Stop Typing",
    value: "stopTyping",
    description:
      "Triggered when the user stops typing. Wire this to chatController.stopTyping().",
  },
  {
    label: "Room Switch",
    value: "roomSwitch",
    description:
      "User clicked a room they are already a member of. Read chatBox.pendingRoomId, then call chatController.switchRoom({{chatBox1.pendingRoomId}}).",
  },
  {
    label: "Room Join",
    value: "roomJoin",
    description:
      "User wants to join a room from search results. Read chatBox.pendingRoomId, then call chatController.joinRoom({{chatBox1.pendingRoomId}}).",
  },
  {
    label: "Room Leave",
    value: "roomLeave",
    description:
      "User clicked leave on a room. Read chatBox.pendingRoomId, then call chatController.leaveRoom({{chatBox1.pendingRoomId}}).",
  },
  {
    label: "Room Create",
    value: "roomCreate",
    description:
      "User submitted the create-room form. Read chatBox.newRoomName, newRoomType, newRoomDescription, newRoomLlmQuery, then call chatController.createRoom(...).",
  },
  {
    label: "Invite Send",
    value: "inviteSend",
    description:
      "User sent a room invite. Read chatBox.inviteTargetUserId, then call chatController.sendInvite(currentRoomId, {{chatBox1.inviteTargetUserId}}).",
  },
  {
    label: "Invite Accept",
    value: "inviteAccept",
    description:
      "User accepted a pending invite. Read chatBox.pendingInviteId, then call chatController.acceptInvite({{chatBox1.pendingInviteId}}).",
  },
  {
    label: "Invite Decline",
    value: "inviteDecline",
    description:
      "User declined a pending invite. Read chatBox.pendingInviteId, then call chatController.declineInvite({{chatBox1.pendingInviteId}}).",
  },
] as const;

// ─── Children map ────────────────────────────────────────────────────────────

const childrenMap = {
  // ── Chat content ─────────────────────────────────────────────────
  chatTitle: stringExposingStateControl("chatTitle", "Chat"),
  showHeader: withDefault(BoolControl, true),
  messages: jsonArrayControl([]),
  currentUserId: withDefault(StringControl, "user_1"),
  currentUserName: withDefault(StringControl, "User"),
  typingUsers: jsonArrayControl([]),
  lastSentMessageText: stringExposingStateControl("lastSentMessageText", ""),
  messageText: stringExposingStateControl("messageText", ""),

  // ── Rooms panel ──────────────────────────────────────────────────
  rooms: jsonArrayControl([]),
  currentRoomId: withDefault(StringControl, ""),
  pendingInvites: jsonArrayControl([]),
  showRoomsPanel: withDefault(BoolControl, true),
  roomsPanelWidth: withDefault(StringControl, "240px"),
  allowRoomCreation: withDefault(BoolControl, true),
  allowRoomSearch: withDefault(BoolControl, true),

  // ── Exposed state written on user interactions ────────────────────
  pendingRoomId: stringExposingStateControl("pendingRoomId", ""),
  newRoomName: stringExposingStateControl("newRoomName", ""),
  newRoomType: stringExposingStateControl("newRoomType", "public"),
  newRoomDescription: stringExposingStateControl("newRoomDescription", ""),
  newRoomLlmQuery: stringExposingStateControl("newRoomLlmQuery", ""),
  inviteTargetUserId: stringExposingStateControl("inviteTargetUserId", ""),
  pendingInviteId: stringExposingStateControl("pendingInviteId", ""),

  // ── Style / layout ────────────────────────────────────────────────
  autoHeight: AutoHeightControl,
  onEvent: eventHandlerControl(ChatEvents),
  style: styleControl(TextStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
};

// ─── Property panel ──────────────────────────────────────────────────────────

const ChatBoxPropertyView = React.memo((props: { children: any }) => {
  const { children } = props;
  const editorMode = useContext(EditorContext).editorModeStatus;

  return (
    <>
      <Section name={sectionNames.basic}>
        {children.chatTitle.propertyView({
          label: "Chat Title",
          tooltip: "Display title shown in the chat header",
        })}
        {children.messages.propertyView({
          label: "Messages",
          tooltip:
            'Bind to your data query, e.g. {{ loadMessages.data }}. Expected shape: [{ id, text, authorId, authorName, timestamp }]',
        })}
        {children.currentUserId.propertyView({
          label: "Current User ID",
          tooltip:
            "The current user's ID — used to distinguish own vs. other messages. Bind to {{ chatController1.userId }}",
        })}
        {children.currentUserName.propertyView({
          label: "Current User Name",
          tooltip: "The current user's display name",
        })}
      </Section>

      <Section name="Rooms Panel">
        {children.showRoomsPanel.propertyView({ label: "Show Rooms Panel" })}
        {children.roomsPanelWidth.propertyView({
          label: "Panel Width",
          tooltip: "Width of the rooms sidebar, e.g. 240px or 30%",
        })}
        {children.rooms.propertyView({
          label: "Rooms",
          tooltip:
            "Bind to {{ chatController1.userRooms }} — the list of rooms visible to the current user.",
        })}
        {children.currentRoomId.propertyView({
          label: "Current Room ID",
          tooltip:
            "Bind to {{ chatController1.currentRoomId }} to highlight the active room.",
        })}
        {children.pendingInvites.propertyView({
          label: "Pending Invites",
          tooltip:
            "Bind to {{ chatController1.pendingInvites }} to show invite notifications.",
        })}
        {children.allowRoomCreation.propertyView({ label: "Allow Room Creation" })}
        {children.allowRoomSearch.propertyView({ label: "Allow Room Search" })}
      </Section>

      <Section name="Real-time">
        {children.typingUsers.propertyView({
          label: "Typing Users",
          tooltip:
            "Array of users currently typing. Bind to {{ chatController1.typingUsers }}",
        })}
      </Section>

      <Section name="Display">
        {children.showHeader.propertyView({ label: "Show Header" })}
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

// ─── Component ───────────────────────────────────────────────────────────────

let ChatBoxV2Tmp = (function () {
  return new UICompBuilder(childrenMap, (props) => {
    const messages = Array.isArray(props.messages) ? props.messages : [];
    const rooms = (Array.isArray(props.rooms) ? props.rooms : []) as unknown as ChatRoom[];
    const typingUsers = Array.isArray(props.typingUsers) ? props.typingUsers : [];
    const pendingInvites = (Array.isArray(props.pendingInvites)
      ? props.pendingInvites
      : []) as unknown as PendingRoomInvite[];
    const currentRoom = rooms.find((r) => r.id === props.currentRoomId) ?? null;

    const contextValue = {
      messages,
      rooms,
      currentRoomId: props.currentRoomId,
      currentRoom,
      currentUserId: props.currentUserId,
      currentUserName: props.currentUserName,
      typingUsers,
      pendingInvites,

      chatTitle: props.chatTitle,
      messageText: props.messageText,
      lastSentMessageText: props.lastSentMessageText,

      showHeader: props.showHeader,
      showRoomsPanel: props.showRoomsPanel,
      roomsPanelWidth: props.roomsPanelWidth,
      allowRoomCreation: props.allowRoomCreation,
      allowRoomSearch: props.allowRoomSearch,
      style: props.style,
      animationStyle: props.animationStyle,

      onEvent: props.onEvent,

      onRoomSwitch: (roomId: string) => {
        props.pendingRoomId.onChange(roomId);
        props.onEvent("roomSwitch");
      },
      onRoomJoin: (roomId: string) => {
        props.pendingRoomId.onChange(roomId);
        props.onEvent("roomJoin");
      },
      onRoomLeave: (roomId: string) => {
        props.pendingRoomId.onChange(roomId);
        props.onEvent("roomLeave");
      },
      onRoomCreate: (
        name: string,
        type: "public" | "private" | "llm",
        description?: string,
        llmQueryName?: string,
      ) => {
        props.newRoomName.onChange(name);
        props.newRoomType.onChange(type);
        props.newRoomDescription.onChange(description || "");
        props.newRoomLlmQuery.onChange(llmQueryName || "");
        props.onEvent("roomCreate");
      },
      onInviteSend: (toUserId: string) => {
        props.inviteTargetUserId.onChange(toUserId);
        props.onEvent("inviteSend");
      },
      onInviteAccept: (inviteId: string) => {
        props.pendingInviteId.onChange(inviteId);
        props.onEvent("inviteAccept");
      },
      onInviteDecline: (inviteId: string) => {
        props.pendingInviteId.onChange(inviteId);
        props.onEvent("inviteDecline");
      },
    };

    return (
      <ChatBoxContext.Provider value={contextValue}>
        <ChatBoxView />
      </ChatBoxContext.Provider>
    );
  })
    .setPropertyViewFn((children) => (
      <ChatBoxPropertyView children={children} />
    ))
    .build();
})();

ChatBoxV2Tmp = class extends ChatBoxV2Tmp {
  override autoHeight(): boolean {
    return this.children.autoHeight.getView();
  }
};

export const ChatBoxV2Comp = withExposingConfigs(ChatBoxV2Tmp, [
  new NameConfig("chatTitle", "Chat display title"),
  new NameConfig(
    "lastSentMessageText",
    "Text of the last message sent by the user — use in your save query",
  ),
  new NameConfig("messageText", "Current text in the message input"),
  new NameConfig(
    "pendingRoomId",
    "Room ID the user wants to switch to, join, or leave — read in roomSwitch/roomJoin/roomLeave events",
  ),
  new NameConfig("newRoomName", "Name entered in the create-room form"),
  new NameConfig(
    "newRoomType",
    "Type selected in the create-room form: public | private | llm",
  ),
  new NameConfig("newRoomDescription", "Description entered in the create-room form"),
  new NameConfig(
    "newRoomLlmQuery",
    "Query name entered for LLM rooms in the create-room form",
  ),
  new NameConfig(
    "inviteTargetUserId",
    "User ID entered in the invite form — read in inviteSend event",
  ),
  new NameConfig(
    "pendingInviteId",
    "Invite ID the user accepted or declined — read in inviteAccept/inviteDecline events",
  ),
  NameConfigHidden,
]);
