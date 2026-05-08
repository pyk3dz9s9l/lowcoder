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
