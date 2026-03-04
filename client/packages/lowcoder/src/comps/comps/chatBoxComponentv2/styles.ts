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

export const Bubble = styled.div<{ $own: boolean }>`
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  align-self: ${(p) => (p.$own ? "flex-end" : "flex-start")};
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
