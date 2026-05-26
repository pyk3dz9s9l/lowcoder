import type { ThreadAssistantMessagePart } from "@assistant-ui/react";

export const AI_HELPER_APPLY_TOOL = "apply_ai_helper_result";

export type AIHelperTargetKind =
  | "sql"
  | "javascript"
  | "echarts-option"
  | "json"
  | "component-field";

export type AIHelperApplyMode = "replace" | "insertAtCursor" | "append";

export interface AIHelperTarget {
  id: string;
  kind: AIHelperTargetKind;
  label?: string;
  language?: "sql" | "javascript" | "css" | "html" | "json";
  currentValue?: string;
  selection?: string;
  cursor?: number;
  datasourceId?: string;
  queryType?: string;
  queryName?: string;
  componentName?: string;
  fieldName?: string;
  fieldDescription?: string;
}

export interface AIHelperApplyAction {
  id: string;
  label: string;
  value: string;
  mode: AIHelperApplyMode;
  language?: string;
}

export type AIHelperToolCallPart = Extract<
  ThreadAssistantMessagePart,
  { type: "tool-call" }
>;

