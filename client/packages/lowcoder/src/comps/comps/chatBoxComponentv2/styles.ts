import styled from "styled-components";
import type { TextStyleType, AnimationStyleType } from "comps/controls/styleControlConstants";

export const Wrapper = styled.div<{ $style: TextStyleType; $anim: AnimationStyleType }>`
  height: 100%;
  display: flex;
  overflow: hidden;
  border-radius: ${(p) => p.$style.radius || "8px"};
  border: ${(p) => p.$style.borderWidth || "1px"} solid ${(p) => p.$style.border || "#e0e0e0"};
  background: ${(p) => p.$style.background || "#fff"};
  font-family: ${(p) => p.$style.fontFamily || "inherit"};
  ${(p) => p.$anim}
`;

export const RoomPanelContainer = styled.div<{ $width: string }>`
  width: ${(p) => p.$width};
  min-width: 160px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
`;

export const RoomPanelHeader = styled.div`
  padding: 12px;
  font-weight: 600;
  font-size: 13px;
  color: #555;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const RoomListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

export const RoomItemStyled = styled.div<{ $active: boolean }>`
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${(p) => (p.$active ? "#1890ff" : "#fff")};
  color: ${(p) => (p.$active ? "#fff" : "#333")};
  border: 1px solid ${(p) => (p.$active ? "#1890ff" : "#f0f0f0")};

  &:hover {
    background: ${(p) => (p.$active ? "#1890ff" : "#f5f5f5")};
  }
`;

export const SearchResultBadge = styled.span`
  font-size: 10px;
  background: #e6f7ff;
  color: #1890ff;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 500;
  margin-left: auto;
`;

export const ChatPanelContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const ChatHeaderBar = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MessageWrapper = styled.div<{ $own: boolean }>`
  display: flex;
  flex-direction: column;
  align-self: ${(p) => (p.$own ? "flex-end" : "flex-start")};
  max-width: 70%;
`;

export const Bubble = styled.div<{ $own: boolean }>`
  padding: 10px 14px;
  border-radius: ${(p) => (p.$own ? "16px 16px 4px 16px" : "16px 16px 16px 4px")};
  background: ${(p) => (p.$own ? "#1890ff" : "#f0f0f0")};
  color: ${(p) => (p.$own ? "#fff" : "#333")};
  font-size: 14px;
  word-break: break-word;
`;

export const BubbleMeta = styled.div<{ $own: boolean }>`
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 2px;
  text-align: ${(p) => (p.$own ? "right" : "left")};
`;

export const BubbleTime = styled.div<{ $own: boolean }>`
  font-size: 10px;
  opacity: 0.6;
  margin-top: 4px;
  text-align: ${(p) => (p.$own ? "right" : "left")};
`;

export const InputBarContainer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
  align-items: flex-end;
`;

export const StyledTextArea = styled.textarea`
  flex: 1;
  padding: 8px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 18px;
  resize: none;
  min-height: 36px;
  max-height: 96px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  &:focus {
    border-color: #1890ff;
  }
`;

export const EmptyChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 4px;
`;

export const TypingIndicatorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  align-self: flex-start;
`;

export const TypingDots = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #e8e8e8;
  border-radius: 12px;
  padding: 8px 12px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #999;
    animation: typingBounce 1.4s infinite ease-in-out both;
  }

  span:nth-child(1) { animation-delay: 0s; }
  span:nth-child(2) { animation-delay: 0.2s; }
  span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typingBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

export const TypingLabel = styled.span`
  font-size: 12px;
  color: #999;
  font-style: italic;
`;

export const ConnectionBanner = styled.div<{ $status: "online" | "offline" | "connecting" }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${(p) =>
    p.$status === "online" ? "#52c41a" : p.$status === "offline" ? "#fa541c" : "#999"};
`;

export const ConnectionDot = styled.span<{ $status: "online" | "offline" | "connecting" }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) =>
    p.$status === "online" ? "#52c41a" : p.$status === "offline" ? "#fa541c" : "#d9d9d9"};
`;

// ── LLM / AI message styles ────────────────────────────────────────────────

export const AiBubbleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  max-width: 80%;
  position: relative;

  &:hover .ai-copy-btn {
    opacity: 1;
  }
`;

export const AiBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #7c3aed;
  background: #f3e8ff;
  border-radius: 8px;
  padding: 2px 7px;
  margin-bottom: 4px;
  align-self: flex-start;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

export const AiBubble = styled.div`
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 4px 16px 16px 16px;
  padding: 10px 14px;
  font-size: 14px;
  color: #1f1f1f;
  line-height: 1.6;
  word-break: break-word;

  /* Markdown styles inside the AI bubble */
  p { margin: 0 0 8px; }
  p:last-child { margin-bottom: 0; }
  pre {
    background: #f1f5f9;
    border-radius: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    font-size: 13px;
  }
  code {
    background: #f1f5f9;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 13px;
    font-family: "Fira Mono", "Cascadia Code", monospace;
  }
  pre code {
    background: none;
    padding: 0;
  }
  ul, ol { padding-left: 20px; margin: 6px 0; }
  li { margin-bottom: 2px; }
  blockquote {
    border-left: 3px solid #c084fc;
    margin: 6px 0;
    padding-left: 10px;
    color: #666;
  }
  a { color: #7c3aed; }
  strong { font-weight: 600; }
  h1, h2, h3, h4 { margin: 8px 0 4px; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  th, td { border: 1px solid #e9d5ff; padding: 4px 8px; }
  th { background: #f3e8ff; }
`;

export const AiCopyButton = styled.button`
  position: absolute;
  top: 28px;
  right: -34px;
  width: 26px;
  height: 26px;
  border: none;
  background: #f3e8ff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
  color: #7c3aed;
  font-size: 13px;

  &:hover {
    background: #e9d5ff;
  }
`;

/** Animated "thinking" bubble shown while the LLM query is in-flight. */
export const LlmLoadingBubble = styled.div`
  align-self: flex-start;
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 5px;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c084fc;
    animation: llmThink 1.4s infinite ease-in-out both;
  }
  span:nth-child(1) { animation-delay: 0s; }
  span:nth-child(2) { animation-delay: 0.2s; }
  span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes llmThink {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1.1); opacity: 1; }
  }
`;

/** Icon shown inside room list items for LLM rooms. */
export const LlmRoomBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #7c3aed;
  background: #f3e8ff;
  border-radius: 6px;
  padding: 1px 5px;
  flex-shrink: 0;
`;

// ── Online Presence styles ──────────────────────────────────────────────────

export const OnlinePresenceSection = styled.div`
  border-top: 1px solid #eee;
  padding: 8px;
  flex-shrink: 0;
`;

export const OnlinePresenceLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: #aaa;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  padding: 4px 2px 6px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const OnlineUserItem = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 2px;
  font-size: 12px;
  color: #444;
  overflow: hidden;
`;

export const OnlineAvatar = styled.div<{ $color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
`;

export const OnlineDot = styled.span`
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52c41a;
  border: 1.5px solid #fafbfc;
`;

export const OnlineUserName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const OnlineCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #52c41a;
  font-weight: 500;
`;

export const OnlineCountDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52c41a;
  display: inline-block;
`;
