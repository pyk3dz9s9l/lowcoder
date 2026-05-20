"use client";

import { PropsWithChildren, useCallback, useEffect, useRef, useState, type FC } from "react";
import { CircleXIcon, FileIcon, PaperclipIcon } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAttachment,
} from "@assistant-ui/react";
import styled from "styled-components";
import { Modal } from "antd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledModalTrigger = styled.div`
  cursor: pointer;
  transition: background-color 0.2s;
  padding: 2px;
  border-radius: 4px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const StyledAvatar = styled(Avatar)`
  background-color: #f1f5f9;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
`;

const AttachmentContainer = styled.div`
  display: flex;
  height: 48px;
  width: 160px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 4px;
`;

const AttachmentTextContainer = styled.div`
  flex-grow: 1;
  flex-basis: 0;
  overflow: hidden;
`;

const AttachmentName = styled.p`
  color: #64748b;
  font-size: 12px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
  margin: 0;
  line-height: 16px;
`;

const AttachmentType = styled.p`
  color: #64748b;
  font-size: 12px;
  margin: 0;
  line-height: 16px;
`;

const AttachmentRoot = styled(AttachmentPrimitive.Root)`
  position: relative;
  margin-top: 12px;
`;

const StyledTooltipIconButton = styled(TooltipIconButton)`
  color: #64748b;
  position: absolute;
  right: -12px;
  top: -12px;
  width: 24px;
  height: 24px;

  & svg {
    background-color: white;
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }
`;

const UserAttachmentsContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  gap: 12px;
  grid-column: 1 / -1;
  grid-row-start: 1;
  justify-content: flex-end;
`;

const ComposerAttachmentsContainer = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  gap: 12px;
  overflow-x: auto;
`;

const StyledComposerButton = styled(TooltipIconButton)`
  margin: 10px 0;
  width: 32px;
  height: 32px;
  padding: 8px;
  transition: opacity 0.2s ease-in;
`;

// ScreenReaderOnly component removed as it's no longer needed with ANTD Modal


const useAttachmentSrc = () => {
  // Listen only to image-type attachments
  const attachment = useAttachment(
    useCallback((a: any) => (a.type === "image" ? a : undefined), [])
  );

  const [src, setSrc] = useState<string | undefined>();

  // Keep track of the last generated object URL so that we can revoke it
  const objectUrlRef = useRef<string | undefined>();
  const lastAttachmentIdRef = useRef<string | undefined>();

  useEffect(() => {
    // If the same attachment is rendered again, do nothing
    if (!attachment || attachment.id === lastAttachmentIdRef.current) return;

    // Clean up any previous object URL
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        /* ignore */
      }
      objectUrlRef.current = undefined;
    }

    // ------------------------------------------------------------------
    // 1. New (local) File object – generate a temporary ObjectURL
    // ------------------------------------------------------------------
    if (attachment.file instanceof File) {
      const url = URL.createObjectURL(attachment.file);
      objectUrlRef.current = url;
      setSrc(url);
      lastAttachmentIdRef.current = attachment.id;
      return;
    }

    // ------------------------------------------------------------------
    // 2. Restored attachment coming from storage – use stored base64 image
    // ------------------------------------------------------------------
    const imgPart = attachment.content?.find((p: any) => p.type === "image");
    if (imgPart?.image) {
      setSrc(imgPart.image as string);
      lastAttachmentIdRef.current = attachment.id;
      return;
    }

    // ------------------------------------------------------------------
    // 3. No usable preview – clear src
    // ------------------------------------------------------------------
    setSrc(undefined);
    lastAttachmentIdRef.current = attachment.id;
  }, [attachment]);

  /* Cleanup when the component using this hook unmounts */
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return src;
};
// ============================================================================
// ATTACHMENT COMPONENTS
// ============================================================================

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <img
      src={src}
      style={{
        width: "auto",
        height: "auto",
        maxWidth: "75dvh",
        maxHeight: "75dvh",
        display: isLoaded ? "block" : "none",
        overflow: "clip",
      }}
      onLoad={() => setIsLoaded(true)}
      alt="Preview"
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!src) return <>{children}</>;

  return (
    <>
      <StyledModalTrigger onClick={() => setIsModalOpen(true)}>
        {children}
      </StyledModalTrigger>
      <Modal
        title="Image Attachment Preview"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width="auto"
        style={{ 
          maxWidth: "80vw", 
          top: 20,
        }}
        styles={{
          body: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }
        }}
      >
        <AttachmentPreview src={src} />
      </Modal>
    </>
  );
};

const AttachmentThumb: FC = () => {
  const isImage = useAttachment((a) => a.type === "image");
  const src = useAttachmentSrc();
  return (
    <StyledAvatar>
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileIcon />
      </AvatarFallback>
      <AvatarImage src={src} />
    </StyledAvatar>
  );
};

const AttachmentUI: FC = () => {
  const canRemove = useAttachment((a) => a.source !== "message");
  const typeLabel = useAttachment((a) => {
    const type = a.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
    }
  });
  
  return (
    <Tooltip>
      <AttachmentRoot>
        <AttachmentPreviewDialog>
          <TooltipTrigger asChild>
            <AttachmentContainer>
              <AttachmentThumb />
              <AttachmentTextContainer>
                <AttachmentName>
                  <AttachmentPrimitive.Name />
                </AttachmentName>
                <AttachmentType>{typeLabel}</AttachmentType>
              </AttachmentTextContainer>
            </AttachmentContainer>
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {canRemove && <AttachmentRemove />}
      </AttachmentRoot>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <StyledTooltipIconButton
        tooltip="Remove file"
        side="top"
      >
        <CircleXIcon />
      </StyledTooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

// ============================================================================
// EXPORTED COMPONENTS
// ============================================================================

export const UserMessageAttachments: FC = () => {
  return (
    <UserAttachmentsContainer>
      <MessagePrimitive.Attachments components={{ Attachment: AttachmentUI }} />
    </UserAttachmentsContainer>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <ComposerAttachmentsContainer>
      <ComposerPrimitive.Attachments
        components={{ Attachment: AttachmentUI }}
      />
    </ComposerAttachmentsContainer>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <StyledComposerButton
        tooltip="Add Attachment"
        variant="ghost"
      >
        <PaperclipIcon />
      </StyledComposerButton>
    </ComposerPrimitive.AddAttachment>
  );
};



// ================ AUI NEW UI COMPONENTS ================


// "use client";

// import { type PropsWithChildren, useEffect, useState, type FC } from "react";
// import { XIcon, PlusIcon, FileText } from "lucide-react";
// import {
//   AttachmentPrimitive,
//   ComposerPrimitive,
//   MessagePrimitive,
//   useAuiState,
//   useAui,
// } from "@assistant-ui/react";
// import { useShallow } from "zustand/shallow";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
// import { cn } from "@/lib/utils";

// const useFileSrc = (file: File | undefined) => {
//   const [src, setSrc] = useState<string | undefined>(undefined);

//   useEffect(() => {
//     if (!file) {
//       setSrc(undefined);
//       return;
//     }

//     const objectUrl = URL.createObjectURL(file);
//     setSrc(objectUrl);

//     return () => {
//       URL.revokeObjectURL(objectUrl);
//     };
//   }, [file]);

//   return src;
// };

// const useAttachmentSrc = () => {
//   const { file, src } = useAuiState(
//     useShallow((s): { file?: File; src?: string } => {
//       if (s.attachment.type !== "image") return {};
//       if (s.attachment.file) return { file: s.attachment.file };
//       const src = s.attachment.content?.filter((c) => c.type === "image")[0]
//         ?.image;
//       if (!src) return {};
//       return { src };
//     }),
//   );

//   return useFileSrc(file) ?? src;
// };

// type AttachmentPreviewProps = {
//   src: string;
// };

// const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
//   const [isLoaded, setIsLoaded] = useState(false);
//   return (
//     <img
//       src={src}
//       alt="Attachment preview"
//       className={cn(
//         "block h-auto max-h-[80vh] w-auto max-w-full object-contain",
//         isLoaded
//           ? "aui-attachment-preview-image-loaded"
//           : "aui-attachment-preview-image-loading invisible",
//       )}
//       onLoad={() => setIsLoaded(true)}
//     />
//   );
// };

// const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
//   const src = useAttachmentSrc();

//   if (!src) return children;

//   return (
//     <Dialog>
//       <DialogTrigger
//         className="aui-attachment-preview-trigger cursor-pointer transition-colors hover:bg-accent/50"
//         asChild
//       >
//         {children}
//       </DialogTrigger>
//       <DialogContent className="aui-attachment-preview-dialog-content p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0! [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive">
//         <DialogTitle className="aui-sr-only sr-only">
//           Image Attachment Preview
//         </DialogTitle>
//         <div className="aui-attachment-preview relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background">
//           <AttachmentPreview src={src} />
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// const AttachmentThumb: FC = () => {
//   const src = useAttachmentSrc();

//   return (
//     <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
//       <AvatarImage
//         src={src}
//         alt="Attachment preview"
//         className="aui-attachment-tile-image object-cover"
//       />
//       <AvatarFallback>
//         <FileText className="aui-attachment-tile-fallback-icon size-8 text-muted-foreground" />
//       </AvatarFallback>
//     </Avatar>
//   );
// };

// const AttachmentUI: FC = () => {
//   const aui = useAui();
//   const isComposer = aui.attachment.source !== "message";

//   const isImage = useAuiState((s) => s.attachment.type === "image");
//   const typeLabel = useAuiState((s) => {
//     const type = s.attachment.type;
//     switch (type) {
//       case "image":
//         return "Image";
//       case "document":
//         return "Document";
//       case "file":
//         return "File";
//       default:
//         return type;
//     }
//   });

//   return (
//     <Tooltip>
//       <AttachmentPrimitive.Root
//         className={cn(
//           "aui-attachment-root relative",
//           isImage && "aui-attachment-root-composer only:*:first:size-24",
//         )}
//       >
//         <AttachmentPreviewDialog>
//           <TooltipTrigger asChild>
//             <div
//               className="aui-attachment-tile size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border bg-muted transition-opacity hover:opacity-75"
//               role="button"
//               tabIndex={0}
//               aria-label={`${typeLabel} attachment`}
//             >
//               <AttachmentThumb />
//             </div>
//           </TooltipTrigger>
//         </AttachmentPreviewDialog>
//         {isComposer && <AttachmentRemove />}
//       </AttachmentPrimitive.Root>
//       <TooltipContent side="top">
//         <AttachmentPrimitive.Name />
//       </TooltipContent>
//     </Tooltip>
//   );
// };

// const AttachmentRemove: FC = () => {
//   return (
//     <AttachmentPrimitive.Remove asChild>
//       <TooltipIconButton
//         tooltip="Remove file"
//         className="aui-attachment-tile-remove absolute end-1.5 top-1.5 size-3.5 rounded-full bg-white text-muted-foreground opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black hover:[&_svg]:text-destructive"
//         side="top"
//       >
//         <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
//       </TooltipIconButton>
//     </AttachmentPrimitive.Remove>
//   );
// };

// export const UserMessageAttachments: FC = () => {
//   return (
//     <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
//       <MessagePrimitive.Attachments>
//         {() => <AttachmentUI />}
//       </MessagePrimitive.Attachments>
//     </div>
//   );
// };

// export const ComposerAttachments: FC = () => {
//   return (
//     <div className="aui-composer-attachments flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
//       <ComposerPrimitive.Attachments>
//         {() => <AttachmentUI />}
//       </ComposerPrimitive.Attachments>
//     </div>
//   );
// };

// export const ComposerAddAttachment: FC = () => {
//   return (
//     <ComposerPrimitive.AddAttachment asChild>
//       <TooltipIconButton
//         tooltip="Add Attachment"
//         side="bottom"
//         variant="ghost"
//         size="icon"
//         className="aui-composer-add-attachment size-8 rounded-full p-1 font-semibold text-xs hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
//         aria-label="Add Attachment"
//       >
//         <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
//       </TooltipIconButton>
//     </ComposerPrimitive.AddAttachment>
//   );
// };

// =================ENDS here ==================
