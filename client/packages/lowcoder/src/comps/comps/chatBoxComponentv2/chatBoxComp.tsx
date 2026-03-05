import React, { useContext } from "react";
import { Section, sectionNames } from "lowcoder-design";
import { UICompBuilder, withDefault } from "../../generators";
import { NameConfig, NameConfigHidden, withExposingConfigs } from "../../generators/withExposing";
import { withMethodExposing } from "../../generators/withMethodExposing";
import { stringExposingStateControl } from "comps/controls/codeStateControl";
import { BoolControl } from "comps/controls/boolControl";
import { StringControl } from "comps/controls/codeControl";
import { AutoHeightControl } from "comps/controls/autoHeightControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { styleControl } from "comps/controls/styleControl";
import { AnimationStyle, TextStyle } from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";
import { trans } from "i18n";

import { ChatBoxView } from "./components/ChatBoxView";

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
  wsUrl: withDefault(StringControl, "ws://localhost:3005"),

  allowRoomCreation: withDefault(BoolControl, true),
  allowRoomSearch: withDefault(BoolControl, true),
  showRoomPanel: withDefault(BoolControl, true),
  roomPanelWidth: withDefault(StringControl, "220px"),

  autoHeight: AutoHeightControl,
  onEvent: eventHandlerControl(ChatEvents),
  style: styleControl(TextStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
};

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
        {children.wsUrl.propertyView({
          label: "WebSocket URL",
          tooltip: "Yjs WebSocket server URL for real-time sync (e.g. ws://localhost:3005)",
        })}
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
