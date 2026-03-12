import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip } from "antd";
import { CopyOutlined, CheckOutlined, RobotOutlined } from "@ant-design/icons";
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
} from "../styles";

// ── AI message bubble with copy button ───────────────────────────────────────

const AiMessageBubble = React.memo(
  ({ text, authorName, timestamp }: { text: string; authorName: string; timestamp: number }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    }, [text]);

    return (
      <AiBubbleWrapper>
        <AiBadge>
          <RobotOutlined style={{ fontSize: 9 }} />
          {authorName}
        </AiBadge>
        <div style={{ position: "relative" }}>
          <AiBubble>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </AiBubble>
          <Tooltip title={copied ? "Copied!" : "Copy"} placement="right">
            <AiCopyButton
              className="ai-copy-btn"
              onClick={handleCopy}
              aria-label="Copy AI response"
            >
              {copied ? (
                <CheckOutlined style={{ fontSize: 11, color: "#52c41a" }} />
              ) : (
                <CopyOutlined style={{ fontSize: 11 }} />
              )}
            </AiCopyButton>
          </Tooltip>
        </div>
        {timestamp > 0 && (
          <BubbleTime $own={false}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </BubbleTime>
        )}
      </AiBubbleWrapper>
    );
  },
);

AiMessageBubble.displayName = "AiMessageBubble";

// ── Helpers to read message fields flexibly ───────────────────────────────────

function readField(msg: any, ...keys: string[]): string {
  for (const k of keys) {
    if (msg[k] != null && msg[k] !== "") return String(msg[k]);
  }
  return "";
}

function readTimestamp(msg: any): number {
  const raw =
    msg.timestamp ?? msg.createdAt ?? msg.created_at ?? msg.time ?? 0;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ── Main component ───────────────────────────────────────────────────────────

export interface MessageListProps {
  messages: any[];
  typingUsers: any[];
  currentUserId: string;
}

export const MessageList = React.memo((props: MessageListProps) => {
  const { messages, typingUsers, currentUserId } = props;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <MessagesArea>
      {messages.length === 0 ? (
        <EmptyChat>
          <div style={{ fontSize: 24 }}>💬</div>
          <div>No messages yet</div>
          <div style={{ fontSize: 12 }}>Start the conversation!</div>
        </EmptyChat>
      ) : (
        messages.map((msg, idx) => {
          const id = readField(msg, "id", "_id") || `msg_${idx}`;
          const text = readField(msg, "text", "message", "content");
          const authorId = readField(
            msg,
            "authorId",
            "userId",
            "author_id",
            "sender",
          );
          const authorName =
            readField(
              msg,
              "authorName",
              "userName",
              "author_name",
              "senderName",
            ) || authorId;
          const timestamp = readTimestamp(msg);
          const authorType = msg.authorType || msg.role || "";

          const isAssistant =
            authorType === "assistant" ||
            authorId === LLM_BOT_AUTHOR_ID;
          const isOwn = !isAssistant && authorId === currentUserId;

          if (isAssistant) {
            return (
              <AiMessageBubble
                key={id}
                text={text}
                authorName={authorName}
                timestamp={timestamp}
              />
            );
          }

          return (
            <div key={id}>
              <BubbleMeta $own={isOwn}>{authorName}</BubbleMeta>
              <Bubble $own={isOwn}>{text}</Bubble>
              {timestamp > 0 && (
                <BubbleTime $own={isOwn}>
                  {new Date(timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </BubbleTime>
              )}
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
              ? `${typingUsers[0].userName || typingUsers[0].userId || "Someone"} is typing...`
              : `${typingUsers.length} people are typing...`}
          </TypingLabel>
        </TypingIndicatorWrapper>
      )}

      <div ref={bottomRef} />
    </MessagesArea>
  );
});

MessageList.displayName = "MessageList";
