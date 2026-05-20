import "@assistant-ui/react-markdown/styles/dot.css";

import {
  CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import styled from "styled-components";

import { TooltipIconButton } from "./tooltip-icon-button";
import { cn } from "./utils/cn";

const StyledMarkdownTextPrimitive = styled(MarkdownTextPrimitive)`
  color: inherit;
  font-size: inherit;
  line-height: inherit;

  .aui-md-h1,
  .aui-md-h2,
  .aui-md-h3,
  .aui-md-h4,
  .aui-md-h5,
  .aui-md-h6 {
    color: #111827;
    font-weight: 600;
    line-height: 1.35;
    margin: 14px 0 8px;
  }

  .aui-md-h1 {
    font-size: 18px;
  }

  .aui-md-h2,
  .aui-md-h3 {
    font-size: 16px;
  }

  .aui-md-h4,
  .aui-md-h5,
  .aui-md-h6,
  .aui-md-p {
    font-size: 14px;
  }

  .aui-md-p {
    margin: 0 0 10px;
  }

  .aui-md-a {
    color: #1677ff;
  }

  .aui-md-blockquote {
    border-left: 3px solid #d9d9d9;
    color: #4b5563;
    margin: 12px 0;
    padding: 2px 0 2px 12px;
  }

  .aui-md-ul,
  .aui-md-ol {
    margin: 8px 0 10px;
    padding-left: 22px;
  }

  .aui-md-hr {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 16px 0;
  }

  .aui-md-table {
    border-collapse: collapse;
    margin: 12px 0;
    width: 100%;
  }

  .aui-md-th,
  .aui-md-td {
    border: 1px solid #e5e7eb;
    padding: 6px 8px;
    text-align: left;
  }

  .aui-md-th {
    background: #f3f4f6;
    font-weight: 600;
  }

  .aui-md-pre {
    background: #111827;
    border-radius: 0 0 8px 8px;
    color: #f9fafb;
    margin: 0 0 12px;
    overflow-x: auto;
    padding: 12px;
  }

  .aui-md-inline-code {
    background: #f3f4f6;
    border-radius: 4px;
    color: #111827;
    padding: 1px 4px;
  }

  .aui-code-header-root {
    align-items: center;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    display: flex;
    font-size: 12px;
    justify-content: space-between;
    margin-top: 10px;
    padding: 6px 10px;
  }

  .aui-code-header-language {
    color: #4b5563;
    font-weight: 500;
    text-transform: lowercase;
  }
`;

const MarkdownTextImpl = () => {
  return (
    <StyledMarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={defaultComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="aui-code-header-root">
      <span className="aui-code-header-language">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn("aui-md-h1", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("aui-md-h2", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("aui-md-h3", className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("aui-md-h4", className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn("aui-md-h5", className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn("aui-md-h6", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("aui-md-p", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("aui-md-a", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn("aui-md-blockquote", className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("aui-md-ul", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("aui-md-ol", className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("aui-md-hr", className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table className={cn("aui-md-table", className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th className={cn("aui-md-th", className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("aui-md-td", className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn("aui-md-tr", className)} {...props} />
  ),
  sup: ({ className, ...props }) => (
    <sup className={cn("aui-md-sup", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn("aui-md-pre", className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(!isCodeBlock && "aui-md-inline-code", className)}
        {...props}
      />
    );
  },
  CodeHeader,
});

