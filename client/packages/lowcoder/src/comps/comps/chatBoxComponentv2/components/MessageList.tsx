import React, { useEffect, useRef } from "react";
import type { ChatMessage, TypingUser } from "../store";
import {
  MessagesArea,
  Bubble,
  BubbleMeta,
  BubbleTime,
  EmptyChat,
  TypingIndicatorWrapper,
  TypingDots,
  TypingLabel,
} from "../styles";

export interface MessageListProps {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  currentUserId: string;
  ready: boolean;
}

export const MessageList = React.memo((props: MessageListProps) => {
  const { messages, typingUsers, currentUserId, ready } = props;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <MessagesArea>
      {messages.length === 0 ? (
        <EmptyChat>
          <div style={{ fontSize: 24 }}>💬</div>
          <div>No messages yet</div>
          <div style={{ fontSize: 12 }}>
            {ready ? "Start the conversation!" : "Connecting..."}
          </div>
        </EmptyChat>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.authorId === currentUserId;
          return (
            <div key={msg.id}>
              <BubbleMeta $own={isOwn}>{msg.authorName}</BubbleMeta>
              <Bubble $own={isOwn}>{msg.text}</Bubble>
              <BubbleTime $own={isOwn}>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </BubbleTime>
            </div>
          );
        })
      )}
      {typingUsers.length > 0 && (
        <TypingIndicatorWrapper>
          <TypingDots>
            <span />
            <span />
            <span />
          </TypingDots>
          <TypingLabel>
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing...`
              : `${typingUsers.length} people are typing...`}
          </TypingLabel>
        </TypingIndicatorWrapper>
      )}
      <div ref={endRef} />
    </MessagesArea>
  );
});

MessageList.displayName = "MessageList";
