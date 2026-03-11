import React, { useCallback, useContext, useEffect, useRef } from "react";
import { Section, sectionNames } from "lowcoder-design";
import { UICompBuilder, withDefault } from "../../generators";
import { NameConfig, NameConfigHidden, withExposingConfigs } from "../../generators/withExposing";
import { withMethodExposing } from "../../generators/withMethodExposing";
import { stringExposingStateControl, arrayObjectExposingStateControl } from "comps/controls/codeStateControl";
import { BoolControl } from "comps/controls/boolControl";
import { StringControl } from "comps/controls/codeControl";
import { AutoHeightControl } from "comps/controls/autoHeightControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { styleControl } from "comps/controls/styleControl";
import { AnimationStyle, TextStyle } from "comps/controls/styleControlConstants";
import { hiddenPropertyView } from "comps/utils/propertyUtils";
import { EditorContext } from "comps/editorState";
import { trans } from "i18n";

import { PluvRoomProvider, pluvConfig } from "./store";
import { yjs } from "@pluv/crdt-yjs";
import { ChatBoxView } from "./components/ChatBoxView";

const ChatEvents = [
  { label: trans("chatBox.messageSent"), value: "messageSent", description: trans("chatBox.messageSentDesc") },
  { label: trans("chatBox.messageReceived"), value: "messageReceived", description: trans("chatBox.messageReceivedDesc") },
  { label: trans("chatBox.roomJoined"), value: "roomJoined", description: trans("chatBox.roomJoinedDesc") },
  { label: trans("chatBox.roomLeft"), value: "roomLeft", description: trans("chatBox.roomLeftDesc") },
  {
    label: "LLM Message Received",
    value: "llmMessageReceived",
    description: "Fired when an AI response arrives in an LLM room",
  },
] as const;

const childrenMap = {
  chatName: stringExposingStateControl("chatName", "Chat Room"),
  userId: stringExposingStateControl("userId", "user_1"),
  userName: stringExposingStateControl("userName", "User"),
  applicationId: stringExposingStateControl("applicationId", "lowcoder_app"),

  // Pluv.io connection settings
  pluvPublicKey: withDefault(StringControl, ""),
  pluvAuthUrl: withDefault(StringControl, "/api/auth/pluv"),

  // Room panel
  allowRoomCreation: withDefault(BoolControl, true),
  allowRoomSearch: withDefault(BoolControl, true),
  showRoomPanel: withDefault(BoolControl, true),
  roomPanelWidth: withDefault(StringControl, "220px"),

  // LLM settings
  systemPrompt: withDefault(
    StringControl,
    "You are a helpful AI assistant. Answer concisely and clearly.",
  ),
  llmBotName: withDefault(StringControl, "AI Assistant"),

  // Exposed state
  llmConversationHistory: arrayObjectExposingStateControl("llmConversationHistory", []),

  // Layout / style
  autoHeight: AutoHeightControl,
  onEvent: eventHandlerControl(ChatEvents),
  style: styleControl(TextStyle, "style"),
  animationStyle: styleControl(AnimationStyle, "animationStyle"),
};

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
      </Section>

      <Section name="Pluv.io Connection">
        {children.pluvPublicKey.propertyView({
          label: "Public Key",
          tooltip: "Pluv.io publishable key (pk_...). Can also be set via VITE_PLUV_PUBLIC_KEY env var.",
        })}
        {children.pluvAuthUrl.propertyView({
          label: "Auth URL",
          tooltip: "Pluv auth endpoint URL for token exchange (e.g. /api/auth/pluv or http://localhost:3006/api/auth/pluv)",
        })}
      </Section>

      <Section name="Room Settings">
        {children.allowRoomCreation.propertyView({ label: "Allow Room Creation" })}
        {children.allowRoomSearch.propertyView({ label: "Allow Room Search" })}
        {children.showRoomPanel.propertyView({ label: "Show Room Panel" })}
        {children.roomPanelWidth.propertyView({ label: "Panel Width", tooltip: "e.g. 220px or 25%" })}
      </Section>

      <Section name="AI / LLM Settings">
        {children.systemPrompt.propertyView({
          label: "System Prompt",
          tooltip: "Prepended to the conversation history sent to your query. Tells the AI how to behave.",
        })}
        {children.llmBotName.propertyView({
          label: "AI Bot Name",
          tooltip: "Display name shown on AI messages in LLM rooms.",
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
          <Section name={sectionNames.animationStyle} hasTooltip={true}>
            {children.animationStyle.getPropertyView()}
          </Section>
        </>
      )}
    </>
  );
});

ChatBoxPropertyView.displayName = "ChatBoxV2PropertyView";

let ChatBoxV2Tmp = (function () {
  return new UICompBuilder(childrenMap, (props, dispatch) => {
    const onChangeRef = useRef(props.llmConversationHistory.onChange);
    useEffect(() => {
      onChangeRef.current = props.llmConversationHistory.onChange;
    });

    const onConversationHistoryChange = useCallback((history: any[]) => {
      onChangeRef.current(history);
    }, []);

    const appId = props.applicationId.value || "lowcoder_app";
    const userId = props.userId.value || "user_1";
    const userName = props.userName.value || "User";
    const roomName = `chatv2_${appId}`;

    // Update the module-level config before pluv connects.
    // publicKey MUST be set here so resolvePluvPublicKey() returns the right
    // value when PluvRoomProvider opens its WebSocket connection.
    pluvConfig.userId = userId;
    pluvConfig.userName = userName;
    pluvConfig.authUrl = props.pluvAuthUrl || "/api/auth/pluv";
    pluvConfig.publicKey = props.pluvPublicKey || "";

    return (
      <PluvRoomProvider
        room={roomName}
        initialPresence={{ typing: null } as any}
        initialStorage={(t: any) => ({
          rooms: t.map("rooms", []),
          members: t.map("members", []),
          invites: t.map("invites", []),
          messages: t.map("messages", []),
        })}
        onAuthorizationFail={(error: Error) => {
          console.error("[PluvChat] Auth failed:", error);
        }}
      >
        <ChatBoxView
          {...props}
          dispatch={dispatch}
          onConversationHistoryChange={onConversationHistoryChange}
          systemPrompt={props.systemPrompt}
          llmBotName={props.llmBotName}
        />
      </PluvRoomProvider>
    );
  })
    .setPropertyViewFn((children) => <ChatBoxPropertyView children={children} />)
    .build();
})();

ChatBoxV2Tmp = class extends ChatBoxV2Tmp {
  override autoHeight(): boolean {
    return this.children.autoHeight.getView();
  }
};

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

export const ChatBoxV2Comp = withExposingConfigs(ChatBoxV2Tmp, [
  new NameConfig("chatName", "Chat display name"),
  new NameConfig("userId", "Current user ID"),
  new NameConfig("userName", "Current user name"),
  new NameConfig("applicationId", "Application scope"),
  new NameConfig("llmConversationHistory", "Conversation history for the active LLM room (role + content array)"),
  NameConfigHidden,
]);
