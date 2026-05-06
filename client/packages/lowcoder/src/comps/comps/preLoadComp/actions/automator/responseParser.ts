// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/responseParser.ts

/**
 * Parses LLM responses into the `{ explanation, actions }` shape that the
 * Automator executor expects.
 *
 * Two parsing paths, tried in order:
 *
 *  1. **Tool-calls path** (preferred) — the model called
 *     `execute_automator_actions` via OpenAI function-calling. The
 *     arguments are guaranteed-valid JSON, so parsing is trivial.
 *
 *  2. **Legacy text path** (fallback) — the model returned a raw JSON
 *     object in its text content (possibly wrapped in markdown fences or
 *     surrounded by prose). This path uses the same balanced-brace
 *     extraction that shipped before the tool-calling refactor, so
 *     existing queries that haven't been updated keep working.
 */

import { TOOL_NAME } from "./toolDefinitions";

export interface ParsedAutomatorResponse {
  explanation: string;
  actions: AutomatorAction[];
  invalidActionCount: number;
  isStructured: boolean;
}

export interface AutomatorAction {
  action: string;
  component?: string;
  component_name?: string;
  parent_component_name?: string;
  layout?: { x?: number; y?: number; w?: number; h?: number };
  action_parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

// ────────────────────────────────────────────────────────────────────────
// 1. TOOL-CALLS PATH (new, clean)
// ────────────────────────────────────────────────────────────────────────

/**
 * Parse the `tool_calls` array from an OpenAI-compatible chat completion
 * response. Looks for our `execute_automator_actions` call and extracts
 * its `{ explanation, actions }` arguments.
 */
export function parseToolCallResponse(
  toolCalls: unknown[],
  textContent?: string
): ParsedAutomatorResponse {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return { explanation: "", actions: [], invalidActionCount: 0, isStructured: false };
  }

  const call = toolCalls.find(
    (tc: any) => tc?.function?.name === TOOL_NAME
  ) as any;

  if (!call?.function?.arguments) {
    return { explanation: "", actions: [], invalidActionCount: 0, isStructured: false };
  }

  try {
    const args =
      typeof call.function.arguments === "string"
        ? JSON.parse(call.function.arguments)
        : call.function.arguments;

    let explanation = typeof args.explanation === "string" ? args.explanation : "";
    if (textContent && explanation) {
      explanation = textContent + "\n\n" + explanation;
    } else if (textContent && !explanation) {
      explanation = textContent;
    }

    const rawActions = Array.isArray(args.actions) ? args.actions : [];
    const actions: AutomatorAction[] = [];
    let invalidCount = 0;

    for (const a of rawActions) {
      if (a && typeof a === "object" && typeof a.action === "string") {
        actions.push(a as AutomatorAction);
      } else {
        invalidCount++;
      }
    }

    return {
      explanation: explanation || (actions.length > 0 ? "" : ""),
      actions,
      invalidActionCount: invalidCount,
      isStructured: true,
    };
  } catch {
    return { explanation: "", actions: [], invalidActionCount: 0, isStructured: false };
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2. LEGACY TEXT PATH (backward compatibility)
// ────────────────────────────────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    try { return JSON.parse(trimmed); } catch { /* continue */ }
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1].trim()); } catch { /* continue */ }
  }

  const start = trimmed.indexOf("{");
  if (start >= 0) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try { return JSON.parse(trimmed.slice(start, i + 1)); } catch { return null; }
      }
    }
  }

  return null;
}

/**
 * Legacy parser: extract `{ explanation, actions }` from free-form model
 * text. Kept for backward compatibility with queries that don't pass
 * `tools` yet.
 */
export function parseAutomatorResponse(raw: string): ParsedAutomatorResponse {
  const fallback: ParsedAutomatorResponse = {
    explanation: raw ?? "",
    actions: [],
    invalidActionCount: 0,
    isStructured: false,
  };
  if (!raw || typeof raw !== "string") return fallback;

  const obj = extractJson(raw);
  if (!obj) return fallback;

  let explanation = "";
  const e = obj.explanation;
  if (typeof e === "string") explanation = e;
  else if (Array.isArray(e)) explanation = e.filter((x) => typeof x === "string").map((x) => `- ${x}`).join("\n");
  else if (e != null) explanation = JSON.stringify(e);

  const rawActions = Array.isArray(obj.actions) ? obj.actions : [];
  const actions: AutomatorAction[] = [];
  let invalidCount = 0;
  for (const a of rawActions) {
    if (a && typeof a === "object" && typeof a.action === "string") {
      actions.push(a as AutomatorAction);
    } else {
      invalidCount++;
    }
  }

  return {
    explanation: explanation || (actions.length > 0 ? "" : raw),
    actions,
    invalidActionCount: invalidCount,
    isStructured: true,
  };
}

// ────────────────────────────────────────────────────────────────────────
// 3. UNIFIED ENTRY POINT
// ────────────────────────────────────────────────────────────────────────

/**
 * Parse a model response, trying the tool-calls path first and falling
 * back to legacy text extraction.
 *
 * @param response - The raw message object returned by the user's JS query.
 *   Expected shape: `{ content?: string; tool_calls?: any[] }`
 */
export function parseResponse(response: {
  content?: string;
  tool_calls?: unknown[];
}): ParsedAutomatorResponse {
  const { content, tool_calls } = response;

  if (Array.isArray(tool_calls) && tool_calls.length > 0) {
    const result = parseToolCallResponse(tool_calls, content || undefined);
    if (result.isStructured) return result;
  }

  return parseAutomatorResponse(content || "");
}
