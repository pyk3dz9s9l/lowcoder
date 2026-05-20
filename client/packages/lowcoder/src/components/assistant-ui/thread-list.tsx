import { Button } from "./ui/button";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { trans } from "i18n";
import type { FC } from "react";
import styled from "styled-components";

const StyledThreadListRoot = styled(ThreadListPrimitive.Root)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`;

const SkeletonStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SkeletonRow = styled.div`
  align-items: center;
  display: flex;
  height: 36px;
  padding: 0 12px;
`;

const SkeletonBar = styled.div`
  background: #eef0f3;
  border-radius: 4px;
  height: 16px;
  width: 100%;
`;

const StyledNewThreadButton = styled(Button)`
  justify-content: flex-start;
  width: 100%;
`;

const StyledThreadListItem = styled(ThreadListItemPrimitive.Root)`
  align-items: center;
  border-radius: 8px;
  display: flex;
  gap: 6px;
  height: 36px;
  min-width: 0;
  transition: background-color 0.2s ease;

  &:hover,
  &:focus-within,
  &[data-active],
  &[data-active="true"] {
    background: #f3f4f6;
  }

  .aui-thread-list-item-more {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover .aui-thread-list-item-more,
  &:focus-within .aui-thread-list-item-more,
  &[data-active] .aui-thread-list-item-more,
  &[data-active="true"] .aui-thread-list-item-more {
    opacity: 1;
  }
`;

const StyledThreadListTrigger = styled(ThreadListItemPrimitive.Trigger)`
  align-items: center;
  background: transparent;
  border: 0;
  color: #1f2937;
  cursor: pointer;
  display: flex;
  flex: 1;
  font-size: 14px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 0 12px;
  text-align: left;
`;

const ThreadTitle = styled.span`
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledMenuContent = styled(ThreadListItemMorePrimitive.Content)`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  min-width: 144px;
  padding: 4px;
  z-index: 1000;
`;

const StyledMenuItem = styled(ThreadListItemMorePrimitive.Item)<{
  $danger?: boolean;
}>`
  align-items: center;
  border-radius: 6px;
  color: ${(props) => (props.$danger ? "#cf1322" : "#1f2937")};
  cursor: pointer;
  display: flex;
  font-size: 14px;
  gap: 8px;
  outline: none;
  padding: 7px 8px;

  &:hover,
  &:focus {
    background: ${(props) => (props.$danger ? "#fff1f0" : "#f3f4f6")};
  }

  svg {
    height: 16px;
    width: 16px;
  }
`;

const ThreadListSkeleton: FC = () => {
  return (
    <SkeletonStack>
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonRow key={i} role="status" aria-label="Loading threads">
          <SkeletonBar />
        </SkeletonRow>
      ))}
    </SkeletonStack>
  );
};

export const ThreadList: FC = () => {
  return (
    <StyledThreadListRoot className="aui-root aui-thread-list-root">
      <ThreadListNew />
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </StyledThreadListRoot>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <StyledNewThreadButton variant="default">
        <PlusIcon />
        {trans("chat.newThread")}
      </StyledNewThreadButton>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItem: FC = () => {
  return (
    <StyledThreadListItem className="aui-thread-list-item">
      <StyledThreadListTrigger className="aui-thread-list-item-trigger">
        <ThreadTitle className="aui-thread-list-item-title">
          <ThreadListItemPrimitive.Title fallback={trans("chat.newChatTitle")} />
        </ThreadTitle>
      </StyledThreadListTrigger>
      <ThreadListItemMore />
    </StyledThreadListItem>
  );
};

const ThreadListItemMore: FC = () => {
  return (
    <ThreadListItemMorePrimitive.Root>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="aui-thread-list-item-more"
          aria-label="More thread options"
        >
          <MoreHorizontalIcon />
        </Button>
      </ThreadListItemMorePrimitive.Trigger>
      <StyledMenuContent side="bottom" align="start">
        <ThreadListItemPrimitive.Archive asChild>
          <StyledMenuItem>
            <ArchiveIcon />
            Archive
          </StyledMenuItem>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <StyledMenuItem $danger>
            <TrashIcon />
            Delete
          </StyledMenuItem>
        </ThreadListItemPrimitive.Delete>
      </StyledMenuContent>
    </ThreadListItemMorePrimitive.Root>
  );
};
