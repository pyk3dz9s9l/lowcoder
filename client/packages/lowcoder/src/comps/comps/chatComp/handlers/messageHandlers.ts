// client/packages/lowcoder/src/comps/comps/chatComp/handlers/messageHandlers.ts

import { AIAssistantMessageHandler, MessageHandler, MessageResponse, QueryHandlerConfig, ChatMessage } from "../types/chatTypes";
import { routeByNameAction, executeQueryAction } from "lowcoder-core";
import { getPromiseAfterDispatch } from "util/promiseUtils";

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
// ============================================================================

export class AIAssistantQueryHandler implements AIAssistantMessageHandler {
  constructor(private config: QueryHandlerConfig) {}

  async sendMessage(message: ChatMessage, sessionId?: string, conversationHistory?: ChatMessage[]): Promise<MessageResponse> {
    const { chatQuery, dispatch } = this.config;
    const history = conversationHistory ?? [message];
    const llmMessages = history.map((msg) => ({
      role: msg.role,
      content: msg.text,
    }));

    if (!chatQuery || !dispatch) {
      console.log("No AI assistant query selected or dispatch unavailable, returning mock response");
      await new Promise((res) => setTimeout(res, 500));
      return { content: "(mock) You typed: " + message.text };
    }

    try {
      console.log("Executing AI assistant query:", chatQuery);
      const result: any = await getPromiseAfterDispatch(
        dispatch,
        routeByNameAction(
          chatQuery,
          executeQueryAction({
            args: {
              message: { value: message },
              prompt: { value: message.text },
              sessionId: { value: sessionId },
              conversationHistory: { value: history },
              messages: { value: llmMessages },
            },
          })
        )
      );
      console.log("AI assistant query result:", result);
      return result.message;
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