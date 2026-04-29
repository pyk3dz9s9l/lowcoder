import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip } from "antd";
import { CopyOutlined, CheckOutlined, RobotOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { parseMessageTimestamp, formatChatTime } from "util/dateTimeUtils";
import { LLM_BOT_AUTHOR_ID } from "../store";
import type { ChatBoxMessageStyleType } from "comps/controls/styleControlConstants";
import { trans } from "i18n";
import {
  MessagesArea,
  MessageWrapper,
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

function readField(msg: any, ...keys: string[]): string {
  for (const k of keys) {
    if (msg[k] != null && msg[k] !== "") return String(msg[k]);
  }
  return "";
}

// ── AI message bubble with copy button ───────────────────────────────────────

const AiMessageBubble = React.memo(
  ({ text, authorName, ts }: { text: string; authorName: string; ts: dayjs.Dayjs | null }) => {
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
          <Tooltip
            title={copied ? trans("chatBox.copied") : trans("chatBox.copyAction")}
            placement="right"
          >
            <AiCopyButton
              className="ai-copy-btn"
              onClick={handleCopy}
              aria-label={trans("chatBox.copyAiResponse")}
            >
              {copied ? (
                <CheckOutlined style={{ fontSize: 11, color: "#52c41a" }} />
              ) : (
                <CopyOutlined style={{ fontSize: 11 }} />
              )}
            </AiCopyButton>
          </Tooltip>
        </div>
        {ts && (
          <BubbleTime $own={false}>
            {formatChatTime(ts)}
          </BubbleTime>
        )}
      </AiBubbleWrapper>
    );
  },
);

AiMessageBubble.displayName = "AiMessageBubble";

// ── Main component ───────────────────────────────────────────────────────────

export interface MessageListProps {
  messages: any[];
  typingUsers: any[];
  currentUserId: string;
  isAiThinking?: boolean;
  messageStyle?: ChatBoxMessageStyleType;
}

export const MessageList = React.memo((props: MessageListProps) => {
  const { messages, typingUsers, currentUserId, isAiThinking = false, messageStyle } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, isAiThinking]);

  return (
    <MessagesArea ref={containerRef} $messageStyle={messageStyle}>
      {messages.length === 0 ? (
        <EmptyChat>
          <div style={{ fontSize: 24 }}>💬</div>
          <div>{trans("chatBox.noMessagesYet")}</div>
          <div style={{ fontSize: 12 }}>{trans("chatBox.startConversation")}</div>
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
          const ts = parseMessageTimestamp(msg);
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
                ts={ts}
              />
            );
          }

          return (
            <MessageWrapper key={id} $own={isOwn}>
              <BubbleMeta $own={isOwn} $messageStyle={messageStyle}>{authorName}</BubbleMeta>
              <Bubble $own={isOwn} $messageStyle={messageStyle}>{text}</Bubble>
              {ts && (
                <BubbleTime $own={isOwn} $messageStyle={messageStyle}>
                  {formatChatTime(ts)}
                </BubbleTime>
              )}
            </MessageWrapper>
          );
        })
      )}

      {isAiThinking && (
        <AiBubbleWrapper>
          <AiBadge>
            <RobotOutlined style={{ fontSize: 9 }} />
            {trans("chatBox.aiThinking")}
          </AiBadge>
          <LlmLoadingBubble>
            <span />
            <span />
            <span />
          </LlmLoadingBubble>
        </AiBubbleWrapper>
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
              ? trans("chatBox.singleUserTyping", {
                  userName:
                    typingUsers[0].userName ||
                    typingUsers[0].userId ||
                    trans("chatBox.someoneLabel"),
                })
              : trans("chatBox.multipleUsersTyping", { count: typingUsers.length })}
          </TypingLabel>
        </TypingIndicatorWrapper>
      )}

    </MessagesArea>
  );
});

MessageList.displayName = "MessageList";
