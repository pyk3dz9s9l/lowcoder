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
  ChatBoxV2ContainerStyle,
  ChatBoxV2SidebarStyle,
  ChatBoxV2HeaderStyle,
  ChatBoxV2MessageStyle,
  ChatBoxV2InputStyle,
} from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";
import { trans } from "i18n";

import { ChatBoxView } from "./components/ChatBoxView";
import { ChatBoxContext } from "./ChatBoxContext";
import type { ChatRoom, PendingRoomInvite } from "./store";

// ─── Events ──────────────────────────────────────────────────────────────────

const ChatEvents = [
  {
    label: trans("chatBoxV2.messageSent"),
    value: "messageSent",
    description: trans("chatBoxV2.messageSentDesc"),
  },
  {
    label: trans("chatBoxV2.startTyping"),
    value: "startTyping",
    description: trans("chatBoxV2.startTypingDesc"),
  },
  {
    label: trans("chatBoxV2.stopTyping"),
    value: "stopTyping",
    description: trans("chatBoxV2.stopTypingDesc"),
  },
  {
    label: trans("chatBoxV2.roomSwitch"),
    value: "roomSwitch",
    description: trans("chatBoxV2.roomSwitchDesc"),
  },
  {
    label: trans("chatBoxV2.roomJoin"),
    value: "roomJoin",
    description: trans("chatBoxV2.roomJoinDesc"),
  },
  {
    label: trans("chatBoxV2.roomLeave"),
    value: "roomLeave",
    description: trans("chatBoxV2.roomLeaveDesc"),
  },
  {
    label: trans("chatBoxV2.roomCreate"),
    value: "roomCreate",
    description: trans("chatBoxV2.roomCreateDesc"),
  },
  {
    label: trans("chatBoxV2.inviteSend"),
    value: "inviteSend",
    description: trans("chatBoxV2.inviteSendDesc"),
  },
  {
    label: trans("chatBoxV2.inviteAccept"),
    value: "inviteAccept",
    description: trans("chatBoxV2.inviteAcceptDesc"),
  },
  {
    label: trans("chatBoxV2.inviteDecline"),
    value: "inviteDecline",
    description: trans("chatBoxV2.inviteDeclineDesc"),
  },
] as const;

// ─── Children map ────────────────────────────────────────────────────────────

const childrenMap = {
  // ── Chat content ─────────────────────────────────────────────────
  chatTitle: stringExposingStateControl("chatTitle", trans("chatBoxV2.chatTitleDefault")),
  showHeader: withDefault(BoolControl, true),
  messages: jsonArrayControl([]),
  currentUserId: withDefault(StringControl, "user_1"),
  currentUserName: withDefault(StringControl, trans("chatBoxV2.currentUserNameDefault")),
  typingUsers: jsonArrayControl([]),
  isAiThinking: withDefault(BoolControl, false),
  lastSentMessageText: stringExposingStateControl("lastSentMessageText", ""),
  messageText: stringExposingStateControl("messageText", ""),

  // ── Rooms panel ──────────────────────────────────────────────────
  rooms: jsonArrayControl([]),
  currentRoomId: withDefault(StringControl, ""),
  pendingInvites: jsonArrayControl([]),
  onlineUsers: jsonArrayControl([]),
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
  style: styleControl(ChatBoxV2ContainerStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
  sidebarStyle: styleControl(ChatBoxV2SidebarStyle, "sidebarStyle"),
  headerStyle: styleControl(ChatBoxV2HeaderStyle, "headerStyle"),
  messageStyle: styleControl(ChatBoxV2MessageStyle, "messageStyle"),
  inputStyle: styleControl(ChatBoxV2InputStyle, "inputStyle"),
};

// ─── Property panel ──────────────────────────────────────────────────────────

const ChatBoxPropertyView = React.memo((props: { children: any }) => {
  const { children } = props;
  const editorMode = useContext(EditorContext).editorModeStatus;

  return (
    <>
      <Section name={sectionNames.basic}>
        {children.chatTitle.propertyView({
          label: trans("chatBoxV2.chatTitleLabel"),
          tooltip: trans("chatBoxV2.chatTitleTooltip"),
        })}
        {children.messages.propertyView({
          label: trans("chatBoxV2.messagesLabel"),
          tooltip: trans("chatBoxV2.messagesTooltip"),
        })}
        {children.currentUserId.propertyView({
          label: trans("chatBoxV2.currentUserIdLabel"),
          tooltip: trans("chatBoxV2.currentUserIdTooltip"),
        })}
        {children.currentUserName.propertyView({
          label: trans("chatBoxV2.currentUserNameLabel"),
          tooltip: trans("chatBoxV2.currentUserNameTooltip"),
        })}
      </Section>

      <Section name={trans("chatBoxV2.roomsPanelSection")}>
        {children.showRoomsPanel.propertyView({ label: trans("chatBoxV2.showRoomsPanelLabel") })}
        {children.roomsPanelWidth.propertyView({
          label: trans("chatBoxV2.panelWidthLabel"),
          tooltip: trans("chatBoxV2.panelWidthTooltip"),
        })}
        {children.rooms.propertyView({
          label: trans("chatBoxV2.roomsLabel"),
          tooltip: trans("chatBoxV2.roomsTooltip"),
        })}
        {children.currentRoomId.propertyView({
          label: trans("chatBoxV2.currentRoomIdLabel"),
          tooltip: trans("chatBoxV2.currentRoomIdTooltip"),
        })}
        {children.pendingInvites.propertyView({
          label: trans("chatBoxV2.pendingInvitesLabel"),
          tooltip: trans("chatBoxV2.pendingInvitesTooltip"),
        })}
        {children.allowRoomCreation.propertyView({ label: trans("chatBoxV2.allowRoomCreationLabel") })}
        {children.allowRoomSearch.propertyView({ label: trans("chatBoxV2.allowRoomSearchLabel") })}
      </Section>

      <Section name={trans("chatBoxV2.realTimeSection")}>
        {children.typingUsers.propertyView({
          label: trans("chatBoxV2.typingUsersLabel"),
          tooltip: trans("chatBoxV2.typingUsersTooltip"),
        })}
        {children.isAiThinking.propertyView({
          label: trans("chatBoxV2.aiIsThinkingLabel"),
          tooltip: trans("chatBoxV2.aiIsThinkingTooltip"),
        })}
        {children.onlineUsers.propertyView({
          label: trans("chatBoxV2.onlineUsersLabel"),
          tooltip: trans("chatBoxV2.onlineUsersTooltip"),
        })}
      </Section>

      <Section name={trans("chatBoxV2.displaySection")}>
        {children.showHeader.propertyView({ label: trans("chatBoxV2.showHeaderLabel") })}
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
          <Section name={trans("chatBoxV2.sidebarStyleSection")}>
            {children.sidebarStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBoxV2.headerStyleSection")}>
            {children.headerStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBoxV2.messageStyleSection")}>
            {children.messageStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBoxV2.inputStyleSection")}>
            {children.inputStyle.getPropertyView()}
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
    const onlineUsers = Array.isArray(props.onlineUsers) ? props.onlineUsers : [];
    const isAiThinking = Boolean(props.isAiThinking);
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
      onlineUsers: onlineUsers as any,
      isAiThinking,
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
      sidebarStyle: props.sidebarStyle,
      headerStyle: props.headerStyle,
      messageStyle: props.messageStyle,
      inputStyle: props.inputStyle,

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
  new NameConfig("chatTitle", trans("chatBoxV2.chatTitleExposed")),
  new NameConfig(
    "lastSentMessageText",
    trans("chatBoxV2.lastSentMessageTextExposed"),
  ),
  new NameConfig("messageText", trans("chatBoxV2.messageTextExposed")),
  new NameConfig("currentRoomId", trans("chatBoxV2.currentRoomIdExposed")),
  new NameConfig(
    "pendingRoomId",
    trans("chatBoxV2.pendingRoomIdExposed"),
  ),
  new NameConfig("newRoomName", trans("chatBoxV2.newRoomNameExposed")),
  new NameConfig(
    "newRoomType",
    trans("chatBoxV2.newRoomTypeExposed"),
  ),
  new NameConfig("newRoomDescription", trans("chatBoxV2.newRoomDescriptionExposed")),
  new NameConfig(
    "newRoomLlmQuery",
    trans("chatBoxV2.newRoomLlmQueryExposed"),
  ),
  new NameConfig(
    "inviteTargetUserId",
    trans("chatBoxV2.inviteTargetUserIdExposed"),
  ),
  new NameConfig(
    "pendingInviteId",
    trans("chatBoxV2.pendingInviteIdExposed"),
  ),
  NameConfigHidden,
]);
