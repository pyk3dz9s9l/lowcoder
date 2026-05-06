// client/packages/lowcoder/src/comps/comps/chatComp/handlers/messageHandlers.ts

import { AIAssistantMessageHandler, MessageHandler, MessageResponse, QueryHandlerConfig, ChatMessage } from "../types/chatTypes";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";
import {
  buildAutomatorPayload,
  parseResponse,
} from "../../preLoadComp/actions/automator";

// ============================================================================
// QUERY HANDLER
// ============================================================================

export class QueryHandler implements MessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(message: ChatMessage): Promise<MessageResponse> {
    const { chatQuery, dispatch} = this.config;
    
    // If no query selected or dispatch unavailable, return mock response
    if (!chatQuery || !dispatch) {
      console.log("No query selected or dispatch unavailable, returning mock response");
      await new Promise((res) => setTimeout(res, 500));
      return { content: "(mock) You typed: " + message.text };
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
              message: { value: message }, // Full ChatMessage object with attachments
              prompt: { value: message.text }, // Keep backward compatibility
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
// This is the heart of the Lowcoder Automator. On every send it:
//   1. snapshots the current editor state (components, queries, canvas),
//   2. composes a lean system prompt + actions catalog + live context,
//   3. forwards the enriched `messages` array (and a few extras) to the
//      user-defined Lowcoder query (typically a JS query that calls an LLM
//      via an HTTP query),
//   4. parses the model's text reply back into `{ explanation, actions }`,
//   5. returns both — the chat panel renders `explanation` and dispatches
//      `actions` against the editor.
// ============================================================================

export class AIAssistantQueryHandler implements AIAssistantMessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(
    message: ChatMessage,
    sessionId?: string,
    conversationHistory?: ChatMessage[]
  ): Promise<MessageResponse> {
    const { chatQuery, dispatch, getEditorState, enableAutomator = true } = this.config;
    const history = conversationHistory ?? [message];

    // Conversation history in the OpenAI {role, content} shape.
    const rawHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.text,
    }));

    // Build the Automator payload. When the editor state is unavailable
    // (eg. mock setup) we still get a valid (empty) snapshot so the prompt
    // is consistent.
    const editorState = getEditorState ? getEditorState() : null;
    const payload = buildAutomatorPayload({
      history: rawHistory,
      editorState,
      withSystemPrompt: enableAutomator,
    });

    if (!chatQuery || !dispatch) {
      console.log(
        "[Automator] No query selected or dispatch unavailable, returning mock"
      );
      await new Promise((res) => setTimeout(res, 300));
      return {
        content:
          "(mock) Connect a query in the AI Assistant header to enable the Automator.\n\nYou typed: " +
          message.text,
      };
    }

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
            args: {
              // ---- Backward-compatible fields (don't break old test queries)
              message: { value: message },
              prompt: { value: message.text },
              sessionId: { value: sessionId },
              conversationHistory: { value: history },
              messages: { value: payload.messages },

              // ---- Tool calling: the JS query should forward this to the
              //      HTTP body so the LLM can call `execute_automator_actions`
              tools: { value: payload.tools },

              // ---- Extra fields for power users
              system: { value: payload.system },
              context: { value: payload.context },
              actionsCatalog: { value: payload.actionsCatalog },
              componentCatalog: { value: payload.componentCatalog },
              messagesWithoutSystem: { value: rawHistory },
            },
          })
        )
      );

      // The query may return tool_calls (new path) or plain content (legacy).
      // `parseResponse` tries tool_calls first, then falls back to text JSON
      // extraction, so old queries that haven't been updated keep working.
      const raw = result?.message ?? result ?? {};
      const content: string =
        typeof raw === "string"
          ? raw
          : typeof raw.content === "string"
          ? raw.content
          : typeof raw === "object" && !raw.tool_calls
          ? JSON.stringify(raw)
          : "";
      const toolCalls: unknown[] | undefined = raw?.tool_calls;

      const parsed = parseResponse({ content, tool_calls: toolCalls });

      const displayText =
        parsed.isStructured && parsed.explanation
          ? parsed.explanation
          : content;

      console.log("[Automator] parsed", {
        isStructured: parsed.isStructured,
        actions: parsed.actions.length,
        invalid: parsed.invalidActionCount,
      });

      return {
        content: displayText,
        actions: parsed.actions,
        automator: {
          isStructured: parsed.isStructured,
          explanation: parsed.explanation,
          invalidActionCount: parsed.invalidActionCount,
        },
      };
    } catch (e: any) {
      throw new Error(e?.message || "AI assistant query execution failed");
    }
  }
}

// ============================================================================
// MOCK HANDLER (for testing/fallbacks)
// ============================================================================

export class MockHandler implements MessageHandler {
  constructor(private delay: number = 1000) {}

  async sendMessage(message: ChatMessage): Promise<MessageResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return { content: `Mock response: ${message.text}` };
  }
}

// ============================================================================
// HANDLER FACTORY (creates the right handler based on type)
// ============================================================================

export function createMessageHandler(
  type: "query" | "mock",
  config: QueryHandlerConfig
): MessageHandler {
  switch (type) {
    case "query":
      return new QueryHandler(config);
    
    case "mock":
      return new MockHandler();
    
    default:
      throw new Error(`Unknown message handler type: ${type}`);
  }
}