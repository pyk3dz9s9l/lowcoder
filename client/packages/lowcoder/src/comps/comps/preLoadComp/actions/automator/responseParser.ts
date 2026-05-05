// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/responseParser.ts

/**
 * Extracts the structured `{ explanation, actions }` object from an LLM
 * response. Models don't always return clean JSON — they may wrap it in
 * markdown fences, prepend prose, or just return plain text. This parser
 * handles all of those gracefully.
 *
 * Action-name validation is intentionally omitted here — the executor
 * registry in ChatPanelContainer already skips unknown actions with a
 * warning, so double-checking here would be redundant.
 */

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

/**
 * Extract a JSON object from free-form model text.
 *
 * Strategy:
 *  1. Whole string is JSON → parse it.
 *  2. Contains a ```json fence → parse the fence content.
 *  3. Contains a balanced `{ … }` → parse that substring.
 *  4. Give up → return null.
 */
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

  // Normalise explanation (string, array of strings, or other)
  let explanation = "";
  const e = obj.explanation;
  if (typeof e === "string") explanation = e;
  else if (Array.isArray(e)) explanation = e.filter((x) => typeof x === "string").map((x) => `- ${x}`).join("\n");
  else if (e != null) explanation = JSON.stringify(e);

  // Accept any actions that have an `action` string field
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
