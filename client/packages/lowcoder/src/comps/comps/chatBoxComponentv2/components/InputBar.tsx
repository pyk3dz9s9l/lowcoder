import React, { useCallback, useRef, useState } from "react";
import { Button } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { InputBarContainer, StyledTextArea } from "../styles";

export interface InputBarProps {
  onSend: (text: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onDraftChange: (text: string) => void;
}

export const InputBar = React.memo((props: InputBarProps) => {
  const { onSend, onStartTyping, onStopTyping, onDraftChange } = props;
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

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    handleStopTyping();
    onSend(draft.trim());
    setDraft("");
    onDraftChange("");
  }, [draft, onSend, handleStopTyping, onDraftChange]);

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
      onDraftChange(value);

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
    [onStartTyping, handleStopTyping, clearTypingTimeout, onDraftChange],
  );

  return (
    <InputBarContainer>
      <StyledTextArea
        value={draft}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
      />
      <Button
        type="primary"
        shape="circle"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={!draft.trim()}
      />
    </InputBarContainer>
  );
});

InputBar.displayName = "InputBar";
