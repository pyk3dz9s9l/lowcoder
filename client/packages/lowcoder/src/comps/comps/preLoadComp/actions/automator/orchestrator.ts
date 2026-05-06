// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/orchestrator.ts

import type { EditorState } from "@lowcoder-ee/comps/editorState";
import { ACTIONS_CATALOG } from "./actionsCatalog";
import {
  buildEditorSnapshot,
  inferMentionedComponentTypes,
  EditorSnapshot,
} from "./editorSnapshot";
import { getComponentCatalog, ComponentCatalogEntry } from "./componentCatalog";
import { composeSystemMessage } from "./systemPrompt";
import { buildToolDefinitions, OpenAIToolDefinition } from "./toolDefinitions";

/**
 * A "chat message" in the OpenAI-compatible shape (role + content). Almost
 * every LLM HTTP API understands this — OpenAI, Ollama, Together, Anthropic
 * (with a small mapping), Groq, etc.
 *
 * The Automator emits messages in this exact shape inside the `messages`
 * argument that gets passed to the user-defined Lowcoder query.
 */
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OrchestratorInput {
  /** The conversation history so far (already includes the latest user msg). */
  history: { role: "user" | "assistant"; content: string }[];
  /** Live editor state — used to build the EDITOR_CONTEXT block. */
  editorState: EditorState | null | undefined;
  /** When false, skip injecting the system prompt entirely (raw passthrough). */
  withSystemPrompt?: boolean;
}

export interface OrchestratorOutput {
  /** Full message array including the synthesised system message. */
  messages: LLMMessage[];
  /** OpenAI-compatible tool definitions for function calling. */
  tools: OpenAIToolDefinition[];
  /** The composed system message string (also exposed for power users). */
  system: string;
  /** The editor context snapshot (also exposed separately). */
  context: EditorSnapshot;
  /** The actions catalog passed to the model. */
  actionsCatalog: typeof ACTIONS_CATALOG;
  /** The (optionally trimmed) component catalog passed to the model. */
  componentCatalog: ComponentCatalogEntry[];
}

/**
 * Build everything the user-defined Lowcoder query needs to call the LLM
 * with full Lowcoder context. Pure function — does not mutate state, does
 * not call the network.
 */
export function buildAutomatorPayload(input: OrchestratorInput): OrchestratorOutput {
  const { history, editorState, withSystemPrompt = true } = input;

  const context = buildEditorSnapshot(editorState);

  // Slim down the component catalog based on the *latest* user message so
  // we keep the prompt under control.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const mentioned = inferMentionedComponentTypes(lastUser?.content ?? "");
  const componentCatalog = getComponentCatalog(mentioned);

  const system = composeSystemMessage({
    actionsCatalog: ACTIONS_CATALOG,
    componentCatalog,
    editorContext: context,
  });

  const tools = withSystemPrompt ? buildToolDefinitions() : [];

  const messages: LLMMessage[] = [];
  if (withSystemPrompt) {
    messages.push({ role: "system", content: system });
  }
  for (const m of history) {
    messages.push({ role: m.role, content: m.content });
  }

  return {
    messages,
    tools,
    system,
    context,
    actionsCatalog: ACTIONS_CATALOG,
    componentCatalog,
  };
}
