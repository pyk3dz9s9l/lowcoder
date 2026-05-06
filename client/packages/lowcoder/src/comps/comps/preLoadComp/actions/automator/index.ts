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
  parseToolCallResponse,
  parseResponse,
  type ParsedAutomatorResponse,
  type AutomatorAction,
} from "./responseParser";
export {
  buildAutomatorPayload,
  type LLMMessage,
  type OrchestratorInput,
  type OrchestratorOutput,
} from "./orchestrator";
export {
  buildToolDefinitions,
  TOOL_NAME,
  type OpenAIToolDefinition,
} from "./toolDefinitions";

/**
 * Quick-start guide — see automator/README.md for full details.
 *
 * 1. Create an HTTP query (e.g. "llmQuery") pointing at your model endpoint.
 *    Include `"tools": {{ tools.value }}` in the request body.
 *
 * 2. Create a JS query (e.g. "aiQuery") that calls the HTTP query:
 *
 *    return llmQuery.run({
 *      messages: messages.value,
 *      tools: tools.value,
 *    }).then((data) => {
 *      const msg = data?.choices?.[0]?.message;
 *      return {
 *        message: {
 *          role: "assistant",
 *          content: msg?.content || "",
 *          tool_calls: msg?.tool_calls || [],
 *        },
 *      };
 *    });
 *
 * 3. In the bottom panel, click the AI tab, select "aiQuery", and chat.
 */
