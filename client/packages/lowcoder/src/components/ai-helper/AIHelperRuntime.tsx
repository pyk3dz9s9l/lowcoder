import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useCallback, useMemo, useState } from "react";

import { Thread } from "components/assistant-ui/thread";
import type { ChatMessage } from "comps/comps/chatComp/types/chatTypes";
import {
  createAssistantErrorMessage,
  createUserMessage,
  getTextFromAppendMessage,
  toChatMessage,
} from "comps/comps/chatComp/utils/assistantMessages";

import { ApplyActions } from "./components/ApplyActions";
import { AIHelperQueryHandler } from "./handlers/AIHelperQueryHandler";
import { useAIHelper } from "./context/AIHelperController";
import {
  AI_HELPER_APPLY_TOOL,
  type AIHelperApplyAction,
  type AIHelperToolCallPart,
  type AIHelperTarget,
} from "./types";

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getApplyActions(message: ChatMessage | undefined): AIHelperApplyAction[] {
  if (!message) return [];

  return message.content
    .filter(
      (part): part is AIHelperToolCallPart =>
        part.type === "tool-call" && part.toolName === AI_HELPER_APPLY_TOOL
    )
    .reduce<AIHelperApplyAction[]>((actions, part, index) => {
      const args = (part.args ?? {}) as Record<string, any>;
      const result = (part.result ?? {}) as Record<string, any>;
      const value = String(result.value ?? args.value ?? "");
      if (!value) return actions;

      const mode = ["replace", "insertAtCursor", "append"].includes(args.mode)
        ? args.mode
        : "replace";

      actions.push({
        id: part.toolCallId ?? `${message.id}-${index}`,
        label: String(args.label || result.label || "Apply"),
        value,
        mode,
        language:
          typeof args.language === "string"
            ? args.language
            : typeof result.language === "string"
              ? result.language
              : undefined,
      });
      return actions;
    }, []);
}

export function AIHelperRuntime({
  helperQueryName,
  dispatch,
  getEditorState,
  getDatasourceStructures,
  target,
}: {
  helperQueryName: string;
  dispatch: any;
  getEditorState: () => any;
  getDatasourceStructures: () => Record<string, any> | undefined;
  target: AIHelperTarget;
}) {
  const helper = useAIHelper();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const sessionId = useMemo(generateSessionId, [target.id]);

  const handler = useMemo(
    () =>
      new AIHelperQueryHandler({
        helperQueryName,
        dispatch,
        getEditorState,
        getDatasourceStructures,
        target,
      }),
    [
      helperQueryName,
      dispatch,
      getEditorState,
      getDatasourceStructures,
      target,
    ]
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = getTextFromAppendMessage(message);
      if (!text) throw new Error("Cannot send an empty message");

      const userMessage = createUserMessage(text);
      const conversationHistory = [...messages, userMessage];
      setMessages(conversationHistory);
      setIsRunning(true);

      try {
        const assistantMessage = await handler.sendMessage(
          userMessage,
          sessionId,
          conversationHistory
        );
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        setMessages((prev) => [
          ...prev,
          createAssistantErrorMessage(error?.message || "AI Helper failed"),
        ]);
      } finally {
        setIsRunning(false);
      }
    },
    [handler, messages, sessionId]
  );

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages: (next) => setMessages(next.map(toChatMessage)),
    convertMessage: (message: ChatMessage): ThreadMessageLike => message,
    isRunning,
    onNew,
  });

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const actions = getApplyActions(lastAssistant);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread placeholder="Ask about this field..." showAttachments={false} />
      <ApplyActions
        actions={actions}
        onApply={(action) => helper?.applyResult(action)}
      />
    </AssistantRuntimeProvider>
  );
}
