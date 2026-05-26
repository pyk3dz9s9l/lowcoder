import type { EditorState } from "comps/editorState";
import type { DatasourceStructure } from "api/datasourceApi";

import { AI_HELPER_APPLY_TOOL, type AIHelperTarget } from "../types";

export interface AIHelperContextPayload {
  app?: {
    title?: string;
    description?: string;
  };
  target: AIHelperTarget;
  components: Array<{ name: string; type: string }>;
  queries: Array<{ name: string; type: string; datasourceId?: string }>;
  tempStates: Array<{ name: string; type: string }>;
  transformers: Array<{ name: string; type: string }>;
  datasourceSchema?: Record<string, string>;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function flattenDatasourceSchema(
  structure: DatasourceStructure[] | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!structure) return out;

  for (const table of structure) {
    if (!table?.name) continue;
    out[table.name] = "table";
    for (const col of table.columns ?? []) {
      if (!col?.name) continue;
      out[`${table.name}.${col.name}`] = col.type ?? "unknown";
    }
  }

  return out;
}

export function buildAIHelperContext(args: {
  editorState: EditorState | null | undefined;
  datasourceStructures?: Record<string, DatasourceStructure[]>;
  target: AIHelperTarget;
}): AIHelperContextPayload {
  const { editorState, datasourceStructures, target } = args;

  if (!editorState) {
    return {
      target,
      components: [],
      queries: [],
      tempStates: [],
      transformers: [],
    };
  }

  const settings = safe(() => editorState.getAppSettings(), {} as any);
  const components = safe(
    () =>
      editorState.uiCompInfoList().map((info: any) => ({
        name: info.name,
        type: info.type,
      })),
    [] as Array<{ name: string; type: string }>
  );
  const queries = safe<Array<{ name: string; type: string; datasourceId?: string }>>(
    () =>
      editorState.queryCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
        datasourceId: q.datasourceId,
      })),
    [] as Array<{ name: string; type: string; datasourceId?: string }>
  );
  const tempStates = safe(
    () =>
      editorState.getTempStateCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
      })),
    [] as Array<{ name: string; type: string }>
  );
  const transformers = safe(
    () =>
      editorState.getTransformerCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
      })),
    [] as Array<{ name: string; type: string }>
  );

  const datasourceSchema =
    target.datasourceId && datasourceStructures
      ? flattenDatasourceSchema(datasourceStructures[target.datasourceId])
      : undefined;

  return {
    app: {
      title: settings?.title,
      description: settings?.description,
    },
    target,
    components,
    queries,
    tempStates,
    transformers,
    datasourceSchema:
      datasourceSchema && Object.keys(datasourceSchema).length > 0
        ? datasourceSchema
        : undefined,
  };
}

function describeTarget(target: AIHelperTarget): string {
  switch (target.kind) {
    case "sql":
      return `The target is a ${target.queryType || "SQL"} query editor. Help write, explain, or improve SQL for this datasource.`;
    case "javascript":
      return "The target is a JavaScript query/editor. Use modern JavaScript that can run in Lowcoder's query environment.";
    case "echarts-option":
      return "The target is an Apache ECharts option JSON field. Generate valid ECharts option JSON, not Automator actions.";
    case "json":
      return "The target is a JSON field. Generate valid JSON when the user asks for a value.";
    default:
      return target.fieldDescription || "The target is a complex Lowcoder component input.";
  }
}

export function buildAIHelperSystemMessage(context: AIHelperContextPayload) {
  const { target } = context;

  return `You are Lowcoder AI Helper, an embedded field assistant.

You help the builder understand or generate code/data for one focused Lowcoder input.
You are NOT the Automator and must not create, move, or modify Lowcoder canvas components.

Target:
${describeTarget(target)}

Response rules:
- Explain briefly when explanation is useful.
- Prefer concrete code/data that can be pasted into the current target.
- If you produce a replacement value for the target, call the ${AI_HELPER_APPLY_TOOL} tool with the exact value.
- Do not include markdown fences inside tool values.
- Respect the current language/field kind and keep generated values syntactically valid.`;
}

export function buildAIHelperTools() {
  return [
    {
      type: "function",
      function: {
        name: AI_HELPER_APPLY_TOOL,
        description: "Offer a generated value that Lowcoder can apply to the focused editor field.",
        parameters: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description: "Short button label, e.g. Replace SQL or Apply option JSON.",
            },
            value: {
              type: "string",
              description: "The exact code/data to place in the focused field.",
            },
            mode: {
              type: "string",
              enum: ["replace", "insertAtCursor", "append"],
              description: "How to apply the value. Use replace unless the user asks otherwise.",
            },
            language: {
              type: "string",
              description: "Optional language hint such as sql, javascript, or json.",
            },
          },
          required: ["value"],
        },
      },
    },
  ];
}
