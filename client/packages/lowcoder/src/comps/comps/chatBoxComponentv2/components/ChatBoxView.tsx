import React, { useCallback } from "react";
import {
  Wrapper,
  ChatPanelContainer,
  ChatHeaderBar,
} from "../styles";
import { MessageList } from "./MessageList";
import { InputBar } from "./InputBar";

export interface ChatBoxViewProps {
  chatTitle: { value: string; onChange: (v: string) => void };
  showHeader: boolean;
  messages: any;
  currentUserId: string;
  currentUserName: string;
  typingUsers: any;
  lastSentMessageText: { value: string; onChange: (v: string) => void };
  messageText: { value: string; onChange: (v: string) => void };
  style: any;
  animationStyle: any;
  onEvent: (event: "messageSent" | "startTyping" | "stopTyping") => any;
}

export const ChatBoxView = React.memo((props: ChatBoxViewProps) => {
  const {
    chatTitle,
    showHeader,
    messages,
    currentUserId,
    typingUsers,
    lastSentMessageText,
    messageText,
    style,
    animationStyle,
    onEvent,
  } = props;

  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const normalizedTypingUsers = Array.isArray(typingUsers) ? typingUsers : [];

  const handleSend = useCallback(
    (text: string) => {
      lastSentMessageText.onChange(text);
      onEvent("messageSent");
    },
    [lastSentMessageText, onEvent],
  );

  const handleStartTyping = useCallback(() => {
    onEvent("startTyping");
  }, [onEvent]);

  const handleStopTyping = useCallback(() => {
    onEvent("stopTyping");
  }, [onEvent]);

  const handleDraftChange = useCallback(
    (text: string) => {
      messageText.onChange(text);
    },
    [messageText],
  );

  return (
    <Wrapper $style={style} $anim={animationStyle}>
      <ChatPanelContainer>
        {showHeader && (
          <ChatHeaderBar>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {chatTitle.value}
            </div>
          </ChatHeaderBar>
        )}

        <MessageList
          messages={normalizedMessages}
          typingUsers={normalizedTypingUsers}
          currentUserId={currentUserId}
        />

        <InputBar
          onSend={handleSend}
          onStartTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          onDraftChange={handleDraftChange}
        />
      </ChatPanelContainer>
    </Wrapper>
  );
});

ChatBoxView.displayName = "ChatBoxV2View";
