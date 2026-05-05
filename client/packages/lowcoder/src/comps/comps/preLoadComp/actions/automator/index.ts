// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/index.ts

export { AUTOMATOR_SYSTEM_PROMPT, composeSystemMessage } from "./systemPrompt";
export {
  ACTIONS_CATALOG,
  SUPPORTED_ACTIONS,
  type AutomatorActionName,
  type ActionCatalogEntry,
} from "./actionsCatalog";
export {
  getComponentCatalog,
  COMPONENT_TYPES_DEFAULT,
  type ComponentCatalogEntry,
} from "./componentCatalog";
export {
  buildEditorSnapshot,
  inferMentionedComponentTypes,
  type EditorSnapshot,
  type ComponentSnapshot,
  type QuerySnapshot,
} from "./editorSnapshot";
export {
  parseAutomatorResponse,
  type ParsedAutomatorResponse,
  type AutomatorAction,
} from "./responseParser";
export {
  buildAutomatorPayload,
  type LLMMessage,
  type OrchestratorInput,
  type OrchestratorOutput,
} from "./orchestrator";

/**
 * Quick-start guide — see automator/README.md for full details.
 *
 * 1. Create an HTTP query (e.g. "llmQuery") pointing at your model endpoint.
 * 2. Create a JS query (e.g. "aiQuery") that calls the HTTP query:
 *
 *    return llmQuery.run({ messages: messages.value }).then((data) => ({
 *      message: {
 *        role: "assistant",
 *        content: data?.choices?.[0]?.message?.content || "No response."
 *      }
 *    }));
 *
 * 3. In the bottom panel, click the AI tab, select "aiQuery", and chat.
 */
