// client/packages/lowcoder/src/comps/comps/chatComp/handlers/messageHandlers.ts

import { AIAssistantMessageHandler, MessageHandler, QueryHandlerConfig, ChatMessage } from "../types/chatTypes";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import { buildAutomatorPayload } from "../../preLoadComp/actions/automator";
import {
  getTextFromThreadContent,
  toAssistantMessage,
} from "../utils/assistantMessages";

function buildAutomatorQueryArgs(
  message: ChatMessage,
  sessionId: string | undefined,
  conversationHistory: ChatMessage[],
  payload: ReturnType<typeof buildAutomatorPayload>,
  messagesWithoutSystem: Array<{ role: ChatMessage["role"]; content: string }>
) {
  const ai = {
    mode: "automator" as const,
    ...payload,
    message,
    prompt: getTextFromThreadContent(message.content),
    sessionId,
    conversationHistory,
    messagesWithoutSystem,
    responseContract: {
      assistantMessage: "Return an assistant-ui compatible assistant message.",
      actionTool:
        "When modifying Lowcoder, return a tool-call part for execute_automator_actions.",
    },
  };

  return {
    ai: {
      value: ai,
    },
    // Backward compatibility for existing user-created model queries.
    automator: {
      value: ai,
    },
  };
}

// ============================================================================
// QUERY HANDLER
// ============================================================================

export class QueryHandler implements MessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(message: ChatMessage): Promise<ChatMessage> {
    const { chatQuery, dispatch} = this.config;

    if (!chatQuery) {
      throw new Error("Select a query before sending a message");
    }

    if (!dispatch) {
      throw new Error("Query dispatch is unavailable");
    }

    try {
      console.log("Executing query:", chatQuery);
      const result: any = await getPromiseAfterDispatch(
        dispatch,
        routeByNameAction(
          chatQuery,
          executeQueryAction({
            // Pass the full message object so attachments are available in queries
            args: { 
              message: { value: message },
              prompt: { value: getTextFromThreadContent(message.content) },
            },
          })
        )
      );
      console.log("Query result:", result);
      return toAssistantMessage(result);
    } catch (e: any) {
      throw new Error(e?.message || "Query execution failed");
    }
  }
}

// ============================================================================
// AI ASSISTANT QUERY HANDLER (bottom panel)
// ----------------------------------------------------------------------------
// This handler owns the Lowcoder side of the Automator flow:
//   1. snapshot the current editor state,
//   2. build the system prompt, tools, catalogs, and live context,
//   3. pass that payload to the selected user query,
//   4. accept an Assistant UI `ThreadMessageLike` assistant message.
//
// Provider-specific parsing belongs in the selected query/backend bridge.
// ============================================================================

export class AIAssistantQueryHandler implements AIAssistantMessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(
    message: ChatMessage,
    sessionId: string | undefined,
    conversationHistory: ChatMessage[]
  ): Promise<ChatMessage> {
    const { chatQuery, dispatch, getEditorState } = this.config;
    const history = conversationHistory;

    // Conversation history in the OpenAI {role, content} shape.
    const rawHistory = history.map((msg) => ({
      role: msg.role,
      content: getTextFromThreadContent(msg.content),
    }));

    if (!chatQuery) {
      throw new Error("Select an Automator query before sending a message");
    }

    if (!dispatch) {
      throw new Error("Automator dispatch is unavailable");
    }

    if (!getEditorState) {
      throw new Error("Automator editor state is unavailable");
    }

    const editorState = getEditorState();
    const payload = buildAutomatorPayload({
      history: rawHistory,
      editorState,
    });

    try {
      console.log("[Automator] running query:", chatQuery, {
        contextComponents: payload.context.components.length,
        contextQueries: payload.context.queries.length,
        messageCount: payload.messages.length,
      });

      const result: any = await getPromiseAfterDispatch(
        dispatch,
        routeByNameAction(
          chatQuery,
          executeQueryAction({
            args: buildAutomatorQueryArgs(
              message,
              sessionId,
              history,
              payload,
              rawHistory
            ),
          })
        )
      );

      return toAssistantMessage(result);
    } catch (e: any) {
      throw new Error(e?.message || "AI assistant query execution failed");
    }
  }
}

// ============================================================================
// HANDLER FACTORY (creates the right handler based on type)
// ============================================================================

export function createMessageHandler(
  type: "query",
  config: QueryHandlerConfig
): MessageHandler {
  switch (type) {
    case "query":
      return new QueryHandler(config);

    default:
      throw new Error(`Unknown message handler type: ${type}`);
  }
}
