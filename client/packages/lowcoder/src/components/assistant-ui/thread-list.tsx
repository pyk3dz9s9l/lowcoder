import type { FC } from "react";
import { useState } from "react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useThreadListItem,
} from "@assistant-ui/react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { TooltipIconButton } from "./tooltip-icon-button";
import { useThreadListItemRuntime } from "@assistant-ui/react";
import { Button, Flex, Input } from "antd";
import { trans } from "i18n";

import styled from "styled-components";

const StyledPrimaryButton = styled(Button)`
  // padding: 20px;
  // margin-bottom: 20px;
`;


export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root">
      <ThreadListNew />
      <Flex vertical style={{flex: 1, overflow: 'auto', gap: 4}}>
        <ThreadListItems />
      </Flex>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <StyledPrimaryButton size="middle" type="primary" icon={<PlusIcon size={16}/>}>
        {trans("chat.newThread")}
      </StyledPrimaryButton>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItems: FC = () => {
  return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
};

const ThreadListItem: FC = () => {
  const [editing, setEditing] = useState(false);
  
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item">
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger">
        {editing ? (
          <ThreadListItemEditInput 
            onFinish={() => setEditing(false)} 
          />
        ) : (
          <ThreadListItemTitle />
        )}
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemRename 
        onStartEdit={() => setEditing(true)} 
        editing={editing}
      />
      <ThreadListItemDelete />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemTitle: FC = () => {
  return (
    <p className="aui-thread-list-item-title" style={{margin: 0}}>
      <ThreadListItemPrimitive.Title fallback={trans("chat.newChatTitle")} />
    </p>
  );
};

const ThreadListItemDelete: FC = () => {
  return (
    <ThreadListItemPrimitive.Delete asChild>
      <TooltipIconButton
        className="aui-thread-list-item-delete"
        variant="ghost"
        tooltip="Delete thread"
      >
        <Trash2Icon />
      </TooltipIconButton>
    </ThreadListItemPrimitive.Delete>
  );
};



const ThreadListItemEditInput: FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const threadItem = useThreadListItem();
  const threadRuntime = useThreadListItemRuntime();
  
  const currentTitle = threadItem?.title || trans("chat.newChatTitle");
  
  const handleRename = async (newTitle: string) => {
    if (!newTitle.trim() || newTitle === currentTitle){
      onFinish();
      return;
    }
    
    try {
      await threadRuntime.rename(newTitle);
      onFinish();
    } catch (error) {
      console.error("Failed to rename thread:", error);
    }
  };

  return (
    <Input
      size="small"
      defaultValue={currentTitle}
      onBlur={(e) => handleRename(e.target.value)}
      onPressEnter={(e) => handleRename((e.target as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onFinish();
      }}
      autoFocus
      style={{ fontSize: '14px', padding: '2px 8px' }}
    />
  );
};


const ThreadListItemRename: FC<{ onStartEdit: () => void; editing: boolean }> = ({ 
  onStartEdit, 
  editing 
}) => {
  if (editing) return null;

  return (
    <TooltipIconButton
      variant="ghost"
      tooltip="Rename thread"
      onClick={onStartEdit}
    >
      <PencilIcon />
    </TooltipIconButton>
  );
};
  


// ================ NEW AUI COMPONENTS ================

// import { Button } from "@/components/ui/button";
// import { Skeleton } from "@/components/ui/skeleton";
// import {
//   AuiIf,
//   ThreadListItemMorePrimitive,
//   ThreadListItemPrimitive,
//   ThreadListPrimitive,
// } from "@assistant-ui/react";
// import {
//   ArchiveIcon,
//   MoreHorizontalIcon,
//   PlusIcon,
//   TrashIcon,
// } from "lucide-react";
// import type { FC } from "react";

// export const ThreadList: FC = () => {
//   return (
//     <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col gap-1">
//       <ThreadListNew />
//       <AuiIf condition={(s) => s.threads.isLoading}>
//         <ThreadListSkeleton />
//       </AuiIf>
//       <AuiIf condition={(s) => !s.threads.isLoading}>
//         <ThreadListPrimitive.Items>
//           {() => <ThreadListItem />}
//         </ThreadListPrimitive.Items>
//       </AuiIf>
//     </ThreadListPrimitive.Root>
//   );
// };

// const ThreadListNew: FC = () => {
//   return (
//     <ThreadListPrimitive.New asChild>
//       <Button
//         variant="outline"
//         className="aui-thread-list-new h-9 justify-start gap-2 rounded-lg px-3 text-sm hover:bg-muted data-active:bg-muted"
//       >
//         <PlusIcon className="size-4" />
//         New Thread
//       </Button>
//     </ThreadListPrimitive.New>
//   );
// };

// const ThreadListSkeleton: FC = () => {
//   return (
//     <div className="flex flex-col gap-1">
//       {Array.from({ length: 5 }, (_, i) => (
//         <div
//           key={i}
//           role="status"
//           aria-label="Loading threads"
//           className="aui-thread-list-skeleton-wrapper flex h-9 items-center px-3"
//         >
//           <Skeleton className="aui-thread-list-skeleton h-4 w-full" />
//         </div>
//       ))}
//     </div>
//   );
// };

// const ThreadListItem: FC = () => {
//   return (
//     <ThreadListItemPrimitive.Root className="aui-thread-list-item group flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none data-active:bg-muted">
//       <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm">
//         <span className="aui-thread-list-item-title min-w-0 flex-1 truncate">
//           <ThreadListItemPrimitive.Title fallback="New Chat" />
//         </span>
//       </ThreadListItemPrimitive.Trigger>
//       <ThreadListItemMore />
//     </ThreadListItemPrimitive.Root>
//   );
// };

// const ThreadListItemMore: FC = () => {
//   return (
//     <ThreadListItemMorePrimitive.Root>
//       <ThreadListItemMorePrimitive.Trigger asChild>
//         <Button
//           variant="ghost"
//           size="icon"
//           className="aui-thread-list-item-more me-2 size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:bg-accent data-[state=open]:opacity-100 group-data-active:opacity-100"
//         >
//           <MoreHorizontalIcon className="size-4" />
//           <span className="sr-only">More options</span>
//         </Button>
//       </ThreadListItemMorePrimitive.Trigger>
//       <ThreadListItemMorePrimitive.Content
//         side="bottom"
//         align="start"
//         className="aui-thread-list-item-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
//       >
//         <ThreadListItemPrimitive.Archive asChild>
//           <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
//             <ArchiveIcon className="size-4" />
//             Archive
//           </ThreadListItemMorePrimitive.Item>
//         </ThreadListItemPrimitive.Archive>
//         <ThreadListItemPrimitive.Delete asChild>
//           <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-destructive text-sm outline-none hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive">
//             <TrashIcon className="size-4" />
//             Delete
//           </ThreadListItemMorePrimitive.Item>
//         </ThreadListItemPrimitive.Delete>
//       </ThreadListItemMorePrimitive.Content>
//     </ThreadListItemMorePrimitive.Root>
//   );
// };

// =========== ENDS HERE =========