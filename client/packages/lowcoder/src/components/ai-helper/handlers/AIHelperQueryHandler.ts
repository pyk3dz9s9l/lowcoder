import { executeQueryAction, routeByNameAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ChatMessage } from "comps/comps/chatComp/types/chatTypes";
import {
  getTextFromThreadContent,
  toAssistantMessage,
} from "comps/comps/chatComp/utils/assistantMessages";

import {
  buildAIHelperContext,
  buildAIHelperSystemMessage,
  buildAIHelperTools,
  type AIHelperContextPayload,
} from "../context/buildAIHelperContext";
import type { AIHelperTarget } from "../types";

interface AIHelperQueryHandlerConfig {
  helperQueryName: string;
  dispatch: any;
  getEditorState: () => any;
  getDatasourceStructures: () => Record<string, any> | undefined;
  target: AIHelperTarget;
}

function normalizeAssistantMessage(raw: any): ChatMessage {
  const payload = raw?.message ?? raw;

  if (typeof payload === "string") {
    return toAssistantMessage({
      role: "assistant",
      content: [{ type: "text", text: payload }],
    } as ThreadMessageLike);
  }

  if (payload?.role) {
    return toAssistantMessage(payload);
  }

  if (Array.isArray(payload?.content)) {
    return toAssistantMessage({
      role: "assistant",
      content: payload.content,
    } as ThreadMessageLike);
  }

  const text =
    typeof payload?.content === "string"
      ? payload.content
      : typeof payload?.text === "string"
        ? payload.text
        : "";

  return toAssistantMessage({
    role: "assistant",
    content: text ? [{ type: "text", text }] : [],
  } as ThreadMessageLike);
}

function buildHelperPayload(args: {
  message: ChatMessage;
  sessionId?: string;
  conversationHistory: ChatMessage[];
  context: AIHelperContextPayload;
}) {
  const { message, sessionId, conversationHistory, context } = args;
  const messagesWithoutSystem = conversationHistory.map((msg) => ({
    role: msg.role,
    content: getTextFromThreadContent(msg.content),
  }));
  const system = buildAIHelperSystemMessage(context);
  const tools = buildAIHelperTools();
  const messages = [
    { role: "system" as const, content: system },
    {
      role: "system" as const,
      content: `HELPER_CONTEXT:\n${JSON.stringify(context, null, 2)}`,
    },
    ...messagesWithoutSystem,
  ];

  return {
    mode: "helper" as const,
    prompt: getTextFromThreadContent(message.content),
    message,
    sessionId,
    conversationHistory,
    messagesWithoutSystem,
    messages,
    tools,
    system,
    context,
    target: context.target,
    responseContract: {
      assistantMessage: "Return an assistant-ui compatible assistant message.",
      applyTool:
        "When offering code/data to insert, return a tool-call part for apply_ai_helper_result with args { value, label?, mode?, language? }.",
    },
  };
}

export class AIHelperQueryHandler {
  constructor(private readonly config: AIHelperQueryHandlerConfig) {}

  async sendMessage(
    message: ChatMessage,
    sessionId: string | undefined,
    conversationHistory: ChatMessage[]
  ): Promise<ChatMessage> {
    const {
      helperQueryName,
      dispatch,
      getEditorState,
      getDatasourceStructures,
      target,
    } = this.config;

    if (!helperQueryName) {
      throw new Error("Select an AI query before sending a message");
    }
    if (!dispatch) {
      throw new Error("AI Helper dispatch is unavailable");
    }

    const context = buildAIHelperContext({
      editorState: getEditorState(),
      datasourceStructures: getDatasourceStructures(),
      target,
    });
    const ai = buildHelperPayload({
      message,
      sessionId,
      conversationHistory,
      context,
    });

    const result: any = await getPromiseAfterDispatch(
      dispatch,
      routeByNameAction(
        helperQueryName,
        executeQueryAction({
          args: {
            ai: { value: ai },
          },
        })
      )
    );

    return normalizeAssistantMessage(result);
  }
}
