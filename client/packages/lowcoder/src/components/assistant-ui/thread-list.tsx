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
import {
  SkeletonBar,
  SkeletonRow,
  SkeletonStack,
  StyledMenuContent,
  StyledMenuItem,
  StyledNewThreadButton,
  StyledThreadListItem,
  StyledThreadListRoot,
  StyledThreadListTrigger,
  ThreadTitle,
} from "./thread-list.styles";

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
