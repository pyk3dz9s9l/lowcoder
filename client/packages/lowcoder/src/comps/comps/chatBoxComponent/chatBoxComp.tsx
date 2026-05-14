import React, { useContext } from "react";
import { Section, sectionNames } from "lowcoder-design";
import { UICompBuilder, withDefault, stateComp } from "../../generators";
import { changeValueAction, multiChangeAction } from "lowcoder-core";
import {
  NameConfig,
  NameConfigHidden,
  withExposingConfigs,
} from "../../generators/withExposing";
import {
  booleanExposingStateControl,
  stringExposingStateControl,
} from "comps/controls/codeStateControl";
import { BoolControl } from "comps/controls/boolControl";
import {
  ArrayStringControl,
  NumberControl,
  StringControl,
  jsonArrayControl,
} from "comps/controls/codeControl";
import { AutoHeightControl } from "comps/controls/autoHeightControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { styleControl } from "comps/controls/styleControl";
import {
  AnimationStyle,
  ChatBoxContainerStyle,
  ChatBoxSidebarStyle,
  ChatBoxHeaderStyle,
  ChatBoxMessageStyle,
  ChatBoxInputAreaStyle,
  ChatBoxInputFieldStyle,
  ChatBoxInputSendButtonStyle,
  ChatBoxInputAttachButtonStyle,
} from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";
import { trans } from "i18n";

import { ChatBoxView } from "./components/ChatBoxView";
import { ChatBoxContext } from "./ChatBoxContext";
import type { ChatRoom, PendingRoomInvite } from "./store";
import type { JSONObject } from "util/jsonTypes";

// ─── Events ──────────────────────────────────────────────────────────────────

const ChatEvents = [
  {
    label: trans("chatBox.messageSent"),
    value: "messageSent",
    description: trans("chatBox.messageSentDesc"),
  },
  {
    label: trans("chatBox.startTyping"),
    value: "startTyping",
    description: trans("chatBox.startTypingDesc"),
  },
  {
    label: trans("chatBox.stopTyping"),
    value: "stopTyping",
    description: trans("chatBox.stopTypingDesc"),
  },
  {
    label: trans("chatBox.roomSwitch"),
    value: "roomSwitch",
    description: trans("chatBox.roomSwitchDesc"),
  },
  {
    label: trans("chatBox.roomLeave"),
    value: "roomLeave",
    description: trans("chatBox.roomLeaveDesc"),
  },
  {
    label: trans("chatBox.roomCreate"),
    value: "roomCreate",
    description: trans("chatBox.roomCreateDesc"),
  },
  {
    label: trans("chatBox.inviteSend"),
    value: "inviteSend",
    description: trans("chatBox.inviteSendDesc"),
  },
  {
    label: trans("chatBox.inviteAccept"),
    value: "inviteAccept",
    description: trans("chatBox.inviteAcceptDesc"),
  },
  {
    label: trans("chatBox.inviteDecline"),
    value: "inviteDecline",
    description: trans("chatBox.inviteDeclineDesc"),
  },
  {
    label: trans("chatBox.fileUpload"),
    value: "fileUpload",
    description: trans("chatBox.fileUploadDesc"),
  },
] as const;

// ─── Children map ────────────────────────────────────────────────────────────

const childrenMap = {
  // ── Chat content ─────────────────────────────────────────────────
  chatTitle: stringExposingStateControl("chatTitle", trans("chatBox.chatTitleDefault")),
  showHeader: withDefault(BoolControl, true),
  messages: jsonArrayControl([]),
  currentUserId: withDefault(StringControl, "user_1"),
  currentUserName: withDefault(StringControl, trans("chatBox.currentUserNameDefault")),
  typingUsers: jsonArrayControl([]),
  isAiThinking: withDefault(BoolControl, false),
  lastSentMessageText: stringExposingStateControl("lastSentMessageText", ""),
  lastSentMessageTagsLlm: booleanExposingStateControl("lastSentMessageTagsLlm"),
  messageText: stringExposingStateControl("messageText", ""),

  /** Same semantics as the File component: metadata per attachment (uid, name, type, size, lastModified). */
  files: stateComp<JSONObject[]>([]),
  /** Base64-encoded file contents (aligned with File component `value`). */
  value: stateComp<Array<string | null>>([]),
  allowMessageFileUpload: withDefault(BoolControl, true),
  maxMessageFiles: withDefault(NumberControl, 10),
  messageFileType: ArrayStringControl,

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
  style: styleControl(ChatBoxContainerStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
  sidebarStyle: styleControl(ChatBoxSidebarStyle, "sidebarStyle"),
  headerStyle: styleControl(ChatBoxHeaderStyle, "headerStyle"),
  messageStyle: styleControl(ChatBoxMessageStyle, "messageStyle"),
  inputAreaStyle: styleControl(ChatBoxInputAreaStyle, "inputAreaStyle"),
  inputFieldStyle: styleControl(ChatBoxInputFieldStyle, "inputFieldStyle"),
  inputSendButtonStyle: styleControl(ChatBoxInputSendButtonStyle, "inputSendButtonStyle"),
  inputAttachButtonStyle: styleControl(ChatBoxInputAttachButtonStyle, "inputAttachButtonStyle"),
};

// ─── Property panel ──────────────────────────────────────────────────────────

const ChatBoxPropertyView = React.memo((props: { children: any }) => {
  const { children } = props;
  const editorMode = useContext(EditorContext).editorModeStatus;

  return (
    <>
      <Section name={sectionNames.basic}>
        {children.chatTitle.propertyView({
          label: trans("chatBox.chatTitleLabel"),
          tooltip: trans("chatBox.chatTitleTooltip"),
        })}
        {children.messages.propertyView({
          label: trans("chatBox.messagesLabel"),
          tooltip: trans("chatBox.messagesTooltip"),
        })}
        {children.currentUserId.propertyView({
          label: trans("chatBox.currentUserIdLabel"),
          tooltip: trans("chatBox.currentUserIdTooltip"),
        })}
        {children.currentUserName.propertyView({
          label: trans("chatBox.currentUserNameLabel"),
          tooltip: trans("chatBox.currentUserNameTooltip"),
        })}
      </Section>

      <Section name={trans("chatBox.roomsPanelSection")}>
        {children.showRoomsPanel.propertyView({ label: trans("chatBox.showRoomsPanelLabel") })}
        {children.roomsPanelWidth.propertyView({
          label: trans("chatBox.panelWidthLabel"),
          tooltip: trans("chatBox.panelWidthTooltip"),
        })}
        {children.rooms.propertyView({
          label: trans("chatBox.roomsLabel"),
          tooltip: trans("chatBox.roomsTooltip"),
        })}
        {children.currentRoomId.propertyView({
          label: trans("chatBox.currentRoomIdLabel"),
          tooltip: trans("chatBox.currentRoomIdTooltip"),
        })}
        {children.pendingInvites.propertyView({
          label: trans("chatBox.pendingInvitesLabel"),
          tooltip: trans("chatBox.pendingInvitesTooltip"),
        })}
        {children.allowRoomCreation.propertyView({ label: trans("chatBox.allowRoomCreationLabel") })}
        {children.allowRoomSearch.propertyView({ label: trans("chatBox.allowRoomSearchLabel") })}
      </Section>

      <Section name={trans("chatBox.realTimeSection")}>
        {children.typingUsers.propertyView({
          label: trans("chatBox.typingUsersLabel"),
          tooltip: trans("chatBox.typingUsersTooltip"),
        })}
        {children.isAiThinking.propertyView({
          label: trans("chatBox.aiIsThinkingLabel"),
          tooltip: trans("chatBox.aiIsThinkingTooltip"),
        })}
        {children.onlineUsers.propertyView({
          label: trans("chatBox.onlineUsersLabel"),
          tooltip: trans("chatBox.onlineUsersTooltip"),
        })}
      </Section>

      <Section name={trans("chatBox.displaySection")}>
        {children.showHeader.propertyView({ label: trans("chatBox.showHeaderLabel") })}
      </Section>

      <Section name={trans("chatBox.attachmentsSection")}>
        {children.allowMessageFileUpload.propertyView({
          label: trans("chatBox.allowMessageFileUploadLabel"),
          tooltip: trans("chatBox.allowMessageFileUploadTooltip"),
        })}
        {children.maxMessageFiles.propertyView({
          label: trans("chatBox.maxMessageFilesLabel"),
          tooltip: trans("chatBox.maxMessageFilesTooltip"),
        })}
        {children.messageFileType.propertyView({
          label: trans("chatBox.messageFileTypeLabel"),
          placeholder: '[".png",".pdf"]',
          tooltip: trans("chatBox.messageFileTypeTooltip"),
        })}
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
          <Section name={trans("chatBox.sidebarStyleSection")}>
            {children.sidebarStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.headerStyleSection")}>
            {children.headerStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.messageStyleSection")}>
            {children.messageStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.inputAreaStyleSection")}>
            {children.inputAreaStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.inputFieldStyleSection")}>
            {children.inputFieldStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.inputSendButtonStyleSection")}>
            {children.inputSendButtonStyle.getPropertyView()}
          </Section>
          <Section name={trans("chatBox.inputAttachButtonStyleSection")}>
            {children.inputAttachButtonStyle.getPropertyView()}
          </Section>
          <Section name={sectionNames.animationStyle} hasTooltip={true}>
            {children.animationStyle.getPropertyView()}
          </Section>
        </>
      )}
    </>
  );
});

ChatBoxPropertyView.displayName = "ChatBoxPropertyView";

// ─── Component ───────────────────────────────────────────────────────────────

let ChatBoxTmp = (function () {
  return new UICompBuilder(childrenMap, (props, dispatch) => {
    const messages = Array.isArray(props.messages) ? props.messages : [];
    const rooms = (Array.isArray(props.rooms) ? props.rooms : []) as unknown as ChatRoom[];
    const typingUsers = Array.isArray(props.typingUsers) ? props.typingUsers : [];
    const onlineUsers = Array.isArray(props.onlineUsers) ? props.onlineUsers : [];
    const isAiThinking = Boolean(props.isAiThinking);
    const pendingInvites = (Array.isArray(props.pendingInvites)
      ? props.pendingInvites
      : []) as unknown as PendingRoomInvite[];
    const currentRoom = rooms.find((r) => r.id === props.currentRoomId) ?? null;

    const messageFiles = Array.isArray(props.files) ? props.files : [];
    const messageFileValues = Array.isArray(props.value) ? props.value : [];
    const maxMsgFiles =
      typeof props.maxMessageFiles === "number" && props.maxMessageFiles > 0
        ? props.maxMessageFiles
        : 100;

    const clearMessageAttachments = () => {
      dispatch(
        multiChangeAction({
          files: changeValueAction([], false),
          value: changeValueAction([], false),
        }),
      );
    };

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
      lastSentMessageTagsLlm: props.lastSentMessageTagsLlm,

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
      inputAreaStyle: props.inputAreaStyle,
      inputFieldStyle: props.inputFieldStyle,
      inputSendButtonStyle: props.inputSendButtonStyle,
      inputAttachButtonStyle: props.inputAttachButtonStyle,

      allowMessageFileUpload: props.allowMessageFileUpload,
      maxMessageFiles: maxMsgFiles,
      messageFileType: Array.isArray(props.messageFileType) ? props.messageFileType : [],
      messageFiles,
      messageFileValues,
      setMessageAttachments: (nextFiles: JSONObject[], nextValue: Array<string | null>) => {
        dispatch(
          multiChangeAction({
            files: changeValueAction(nextFiles, false),
            value: changeValueAction(nextValue, false),
          }),
        );
      },
      clearMessageAttachments,
      onFileUploadEvent: () => props.onEvent("fileUpload"),

      onEvent: props.onEvent,

      onRoomSwitch: (roomId: string) => {
        props.pendingRoomId.onChange(roomId);
        props.onEvent("roomSwitch");
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

ChatBoxTmp = class extends ChatBoxTmp {
  override autoHeight(): boolean {
    return this.children.autoHeight.getView();
  }
};

export const ChatBoxComp = withExposingConfigs(ChatBoxTmp, [
  new NameConfig("chatTitle", trans("chatBox.chatTitleExposed")),
  new NameConfig("value", trans("chatBox.messageFilesValueExposed")),
  new NameConfig("files", trans("chatBox.messageFilesMetaExposed")),
  new NameConfig(
    "lastSentMessageText",
    trans("chatBox.lastSentMessageTextExposed"),
  ),
  new NameConfig(
    "lastSentMessageTagsLlm",
    trans("chatBox.lastSentMessageTagsLlmExposed"),
  ),
  new NameConfig("messageText", trans("chatBox.messageTextExposed")),
  new NameConfig("currentRoomId", trans("chatBox.currentRoomIdExposed")),
  new NameConfig(
    "pendingRoomId",
    trans("chatBox.pendingRoomIdExposed"),
  ),
  new NameConfig("newRoomName", trans("chatBox.newRoomNameExposed")),
  new NameConfig(
    "newRoomType",
    trans("chatBox.newRoomTypeExposed"),
  ),
  new NameConfig("newRoomDescription", trans("chatBox.newRoomDescriptionExposed")),
  new NameConfig(
    "newRoomLlmQuery",
    trans("chatBox.newRoomLlmQueryExposed"),
  ),
  new NameConfig(
    "inviteTargetUserId",
    trans("chatBox.inviteTargetUserIdExposed"),
  ),
  new NameConfig(
    "pendingInviteId",
    trans("chatBox.pendingInviteIdExposed"),
  ),
  NameConfigHidden,
]);
