// client/packages/lowcoder/src/comps/comps/chatComp/handlers/messageHandlers.ts

import { AIAssistantMessageHandler, MessageHandler, MessageResponse, QueryHandlerConfig, ChatMessage } from "../types/chatTypes";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import { buildAutomatorPayload } from "../../preLoadComp/actions/automator";

interface AutomatorAction {
  action: string;
  component?: string;
  component_name?: string;
  parent_component_name?: string;
  layout?: { x?: number; y?: number; w?: number; h?: number };
  action_parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

function normalizeAutomatorQueryResponse(result: any): MessageResponse {
  const raw = result;

  if (!raw || typeof raw !== "object") {
    throw new Error("Automator query must return an object with content and actions");
  }

  if (typeof raw.content !== "string") {
    throw new Error("Automator query response must include string content");
  }

  const actions: AutomatorAction[] = [];
  let invalidActionCount = 0;

  if (!Array.isArray(raw.actions)) {
    throw new Error("Automator query response must include an actions array");
  }

  for (const action of raw.actions) {
    if (action && typeof action === "object" && typeof action.action === "string") {
      actions.push(action as AutomatorAction);
    } else {
      invalidActionCount++;
    }
  }

  return {
    content: raw.content,
    actions,
    metadata: raw.metadata,
    automator: {
      isStructured: true,
      explanation: raw.content,
      invalidActionCount,
    },
  };
}

function buildAutomatorQueryArgs(
  message: ChatMessage,
  sessionId: string | undefined,
  conversationHistory: ChatMessage[],
  payload: ReturnType<typeof buildAutomatorPayload>,
  messagesWithoutSystem: Array<{ role: ChatMessage["role"]; content: string }>
) {
  return {
    automator: {
      value: {
        ...payload,
        message,
        prompt: message.text,
        sessionId,
        conversationHistory,
        messagesWithoutSystem,
      }
    },
  };
}

// ============================================================================
// QUERY HANDLER
// ============================================================================

export class QueryHandler implements MessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(message: ChatMessage): Promise<MessageResponse> {
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
              prompt: { value: message.text },
            },
          })
        )
      );
      console.log("Query result:", result);
      return result.message
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
//   4. accept the query's normalized `{ content, actions }` result.
//
// Provider-specific parsing belongs in the selected query/backend bridge.
// ============================================================================

export class AIAssistantQueryHandler implements AIAssistantMessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(
    message: ChatMessage,
    sessionId: string | undefined,
    conversationHistory: ChatMessage[]
  ): Promise<MessageResponse> {
    const { chatQuery, dispatch, getEditorState } = this.config;
    const history = conversationHistory;

    // Conversation history in the OpenAI {role, content} shape.
    const rawHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.text,
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

      const response = normalizeAutomatorQueryResponse(result);

      console.log("[Automator] parsed", {
        actions: response.actions?.length ?? 0,
        invalid: response.automator?.invalidActionCount ?? 0,
      });

      return response;
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
