import React, { useCallback, useRef, useState } from "react";
import { Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import type { ChatRoom } from "../store";
import { InputBarContainer, StyledTextArea } from "../styles";

export interface InputBarProps {
  ready: boolean;
  currentRoom: ChatRoom | null;
  onSend: (text: string) => Promise<boolean>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onMessageSentEvent: () => void;
  isLlmLoading?: boolean;
  isLlmRoom?: boolean;
}

export const InputBar = React.memo((props: InputBarProps) => {
  const { ready, currentRoom, onSend, onStartTyping, onStopTyping, onMessageSentEvent, isLlmLoading, isLlmRoom } = props;
  const isDisabled = !ready || !currentRoom || !!isLlmLoading;
  const [draft, setDraft] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const handleStopTyping = useCallback(() => {
    clearTypingTimeout();
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
  }, [onStopTyping, clearTypingTimeout]);

  const handleSend = useCallback(async () => {
    if (!draft.trim()) return;
    handleStopTyping();
    const ok = await onSend(draft);
    if (ok) {
      setDraft("");
      onMessageSentEvent();
    }
  }, [draft, onSend, onMessageSentEvent, handleStopTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setDraft(value);

      if (!value.trim()) {
        handleStopTyping();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onStartTyping();
      }

      clearTypingTimeout();
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping();
      }, 2000);
    },
    [onStartTyping, handleStopTyping, clearTypingTimeout],
  );

  return (
    <InputBarContainer>
      <StyledTextArea
        value={draft}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={
          isLlmLoading
            ? "AI is responding..."
            : ready
            ? isLlmRoom
              ? "Ask the AI..."
              : "Type a message..."
            : "Connecting..."
        }
        disabled={isDisabled}
        rows={1}
      />
      <Button
        type="primary"
        shape="circle"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={!draft.trim() || isDisabled}
        loading={isLlmLoading}
      />
    </InputBarContainer>
  );
});

InputBar.displayName = "InputBar";
