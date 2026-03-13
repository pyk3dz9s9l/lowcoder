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
] as const;

// ─── Children map ────────────────────────────────────────────────────────────

const childrenMap = {
  chatTitle: stringExposingStateControl("chatTitle", "Chat"),
  showHeader: withDefault(BoolControl, true),

  messages: jsonArrayControl([]),
  currentUserId: withDefault(StringControl, "user_1"),
  currentUserName: withDefault(StringControl, "User"),
  typingUsers: jsonArrayControl([]),

  lastSentMessageText: stringExposingStateControl("lastSentMessageText", ""),
  messageText: stringExposingStateControl("messageText", ""),

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
    return (
      <ChatBoxView
        chatTitle={props.chatTitle}
        showHeader={props.showHeader}
        messages={props.messages}
        currentUserId={props.currentUserId}
        currentUserName={props.currentUserName}
        typingUsers={props.typingUsers}
        lastSentMessageText={props.lastSentMessageText}
        messageText={props.messageText}
        style={props.style}
        animationStyle={props.animationStyle}
        onEvent={props.onEvent}
      />
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
  NameConfigHidden,
]);
