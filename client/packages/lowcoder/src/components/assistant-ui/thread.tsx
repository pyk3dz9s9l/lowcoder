import { AuiIf, ThreadPrimitive } from "@assistant-ui/react";
import { LoadingOutlined } from "@ant-design/icons";
import { Flex, Spin } from "antd";
import { ArrowDownIcon } from "lucide-react";
import type { FC } from "react";
import { trans } from "i18n";

import { Composer } from "./thread-composer";
import { StyledThreadRoot } from "./thread.styles";
import { ThreadMessage } from "./thread-message";
import { ThreadWelcome } from "./thread-welcome";
import { TooltipIconButton } from "./tooltip-icon-button";

interface ThreadProps {
  placeholder?: string;
  showAttachments?: boolean;
}

const SimpleANTDLoader = () => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  return (
    <div style={{ textAlign: "left", width: "100%" }}>
      <Flex align="center" gap={12} style={{ paddingLeft: "16px" }}>
        <Spin indicator={antIcon} size="small" />
        <span style={{ color: "#666", fontSize: "14px" }}>
          Working on it...
        </span>
      </Flex>
    </div>
  );
};

export const Thread: FC<ThreadProps> = ({
  placeholder = trans("chat.composerPlaceholder"),
  showAttachments = true,
}) => {
  return (
    <StyledThreadRoot
      className="aui-root aui-thread-root"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-radius" as string]: "24px",
        ["--composer-padding" as string]: "10px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="aui-thread-viewport"
      >
        <div className="aui-thread-layout">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <div data-slot="aui_message-group" className="aui-message-group">
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage showAttachments={showAttachments} />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.If running>
            <SimpleANTDLoader />
          </ThreadPrimitive.If>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer">
            <ThreadScrollToBottom />
            <Composer
              placeholder={placeholder}
              showAttachments={showAttachments}
            />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </StyledThreadRoot>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};
