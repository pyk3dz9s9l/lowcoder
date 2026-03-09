import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip } from "antd";
import { CopyOutlined, CheckOutlined, RobotOutlined } from "@ant-design/icons";
import type { ChatMessage, TypingUser } from "../store";
import { LLM_BOT_AUTHOR_ID } from "../store";
import {
  MessagesArea,
  Bubble,
  BubbleMeta,
  BubbleTime,
  EmptyChat,
  TypingIndicatorWrapper,
  TypingDots,
  TypingLabel,
  AiBubbleWrapper,
  AiBadge,
  AiBubble,
  AiCopyButton,
  LlmLoadingBubble,
} from "../styles";

// ── Copy helper ──────────────────────────────────────────────────────────────

const AiMessageBubble = React.memo(({ msg }: { msg: ChatMessage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [msg.text]);

  return (
    <AiBubbleWrapper>
      <AiBadge>
        <RobotOutlined style={{ fontSize: 9 }} />
        {msg.authorName}
      </AiBadge>

      <div style={{ position: "relative" }}>
        <AiBubble>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
        </AiBubble>

        <Tooltip title={copied ? "Copied!" : "Copy"} placement="right">
          <AiCopyButton className="ai-copy-btn" onClick={handleCopy} aria-label="Copy AI response">
            {copied ? <CheckOutlined style={{ fontSize: 11, color: "#52c41a" }} /> : <CopyOutlined style={{ fontSize: 11 }} />}
          </AiCopyButton>
        </Tooltip>
      </div>

      <BubbleTime $own={false}>
        {new Date(msg.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </BubbleTime>
    </AiBubbleWrapper>
  );
});

AiMessageBubble.displayName = "AiMessageBubble";

// ── Main component ───────────────────────────────────────────────────────────

export interface MessageListProps {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  currentUserId: string;
  ready: boolean;
  isLlmRoom?: boolean;
  isLlmLoading?: boolean;
  llmBotName?: string;
}

export const MessageList = React.memo((props: MessageListProps) => {
  const { messages, typingUsers, currentUserId, ready, isLlmRoom, isLlmLoading, llmBotName } = props;

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or LLM starts/stops loading
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLlmLoading]);

  return (
    <MessagesArea>
      {messages.length === 0 ? (
        <EmptyChat>
          <div style={{ fontSize: 24 }}>{isLlmRoom ? "🤖" : "💬"}</div>
          <div>{isLlmRoom ? `Chat with ${llmBotName || "AI Assistant"}` : "No messages yet"}</div>
          <div style={{ fontSize: 12 }}>
            {ready
              ? isLlmRoom
                ? "Ask anything — the AI will respond to everyone."
                : "Start the conversation!"
              : "Connecting..."}
          </div>
        </EmptyChat>
      ) : (
        messages.map((msg) => {
          const isAssistant = msg.authorType === "assistant" || msg.authorId === LLM_BOT_AUTHOR_ID;
          const isOwn = !isAssistant && msg.authorId === currentUserId;

          if (isAssistant) {
            return <AiMessageBubble key={msg.id} msg={msg} />;
          }

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

      {/* LLM thinking indicator */}
      {isLlmLoading && (
        <div>
          <AiBadge style={{ marginBottom: 4 }}>
            <RobotOutlined style={{ fontSize: 9 }} />
            {llmBotName || "AI Assistant"}
          </AiBadge>
          <LlmLoadingBubble>
            <span /><span /><span />
          </LlmLoadingBubble>
        </div>
      )}

      {/* Human typing indicator — hidden in LLM rooms since AI is always "typing" */}
      {!isLlmLoading && typingUsers.length > 0 && (
        <TypingIndicatorWrapper>
          <TypingDots>
            <span /><span /><span />
          </TypingDots>
          <TypingLabel>
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} is typing...`
              : `${typingUsers.length} people are typing...`}
          </TypingLabel>
        </TypingIndicatorWrapper>
      )}

      <div ref={bottomRef} />
    </MessagesArea>
  );
});

MessageList.displayName = "MessageList";
