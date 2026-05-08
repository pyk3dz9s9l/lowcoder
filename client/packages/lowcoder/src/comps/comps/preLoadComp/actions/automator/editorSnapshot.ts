// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/editorSnapshot.ts

import type { EditorState } from "@lowcoder-ee/comps/editorState";
import { uiCompRegistry } from "comps/uiCompRegistry";
import { LOWCODER_COMPONENT_TYPES } from "./componentCatalog";

/**
 * A compact, JSON-serialisable view of the live editor state.
 *
 * This is what we hand to the LLM as `EDITOR_CONTEXT`, so the model can
 * reason about what already exists on the canvas before emitting actions
 * (avoids name collisions, layout overlap, duplicated queries, etc.).
 *
 * Keep this small. We intentionally drop heavy fields like full property
 * trees, event handlers, deep style objects — those would balloon tokens
 * and rarely help the model. If a deeper inspection is needed later,
 * model can ask the user.
 */

export interface ComponentSnapshot {
  name: string;
  type: string;
  layout?: { x?: number; y?: number; w?: number; h?: number };
  /** Trimmed property hints (label text / placeholder / button text…) */
  hints?: Record<string, unknown>;
}

export interface QuerySnapshot {
  name: string;
  type: string;
}

export interface EditorSnapshot {
  app: {
    title?: string;
    description?: string;
    themeId?: string;
  };
  canvas: {
    gridColumns?: number;
    gridRowHeight?: number;
    gridRowCount?: number | string;
    maxWidth?: string;
  };
  selected: string | null;
  components: ComponentSnapshot[];
  queries: QuerySnapshot[];
  tempStates: QuerySnapshot[];
  transformers: QuerySnapshot[];
}

const HINT_KEYS = new Set([
  "text",
  "title",
  "label",
  "placeholder",
  "src",
  "value",
  "options",
  "columns",
  "open",
]);

function pickHints(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(data)) {
    if (!HINT_KEYS.has(k)) continue;
    const v = (data as any)[k];
    // truncate long strings, drop functions
    if (typeof v === "string") {
      out[k] = v.length > 120 ? v.slice(0, 120) + "…" : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v != null && typeof v === "object") {
      // shallow-copy small objects (e.g. label.text)
      try {
        const json = JSON.stringify(v);
        if (json.length <= 200) out[k] = JSON.parse(json);
      } catch {
        /* ignore */
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Build a snapshot from the live `EditorState`. Always returns a valid
 * object — never throws — so the orchestrator can call this freely without
 * try/catch.
 */
export function buildEditorSnapshot(editorState: EditorState | null | undefined): EditorSnapshot {
  if (!editorState) {
    return {
      app: {},
      canvas: {},
      selected: null,
      components: [],
      queries: [],
      tempStates: [],
      transformers: [],
    };
  }

  const settings = safe(() => editorState.getAppSettings(), {} as any);

  const components = safe<ComponentSnapshot[]>(
    () =>
      editorState.uiCompInfoList().map((info: any): ComponentSnapshot => {
        // The layout x/y/w/h lives on the rootComp's layout map, keyed by
        // the same key as `getAllUICompMap`. We don't have a direct lookup
        // here without scanning, so we leave layout undefined for now and
        // let the model rely on `name` + `type`.
        return {
          name: info.name,
          type: info.type,
          hints: pickHints(info.data),
        };
      }),
    []
  );

  // Try to enrich with layout positions from the root grid.
  safe(() => {
    const uiComp: any = editorState.getUIComp();
    const compChildren = uiComp?.children?.comp?.children;
    const layoutObj = compChildren?.layout?.getView?.() ?? {};
    const items = compChildren?.items?.children ?? {};
    const byName: Record<string, { x?: number; y?: number; w?: number; h?: number }> = {};
    for (const [key, layout] of Object.entries<any>(layoutObj)) {
      const item: any = items[key];
      const name = item?.children?.name?.getView?.();
      if (!name) continue;
      byName[name] = {
        x: layout?.x,
        y: layout?.y,
        w: layout?.w,
        h: layout?.h,
      };
    }
    for (const c of components) {
      if (byName[c.name]) {
        c.layout = byName[c.name];
      }
    }
  }, undefined);

  const queries: QuerySnapshot[] = safe(
    () =>
      editorState.queryCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
      })),
    []
  );
  const tempStates: QuerySnapshot[] = safe(
    () =>
      editorState.getTempStateCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
      })),
    []
  );
  const transformers: QuerySnapshot[] = safe(
    () =>
      editorState.getTransformerCompInfoList().map((q: any) => ({
        name: q.name,
        type: q.type,
      })),
    []
  );

  const selected = safe(() => {
    const sel = Array.from(editorState.selectedCompNames || []);
    return sel.length > 0 ? sel[0] : null;
  }, null);

  return {
    app: {
      title: settings?.title,
      description: settings?.description,
      themeId: settings?.themeId,
    },
    canvas: {
      gridColumns: settings?.gridColumns,
      gridRowHeight: settings?.gridRowHeight,
      gridRowCount: settings?.gridRowCount,
      maxWidth: settings?.maxWidth,
    },
    selected,
    components,
    queries,
    tempStates,
    transformers,
  };
}

/**
 * Best-effort guess of what component types the user just mentioned in a
 * free-form prompt. Used to slim down the component catalog we send to the
 * model so it stays under token budgets.
 *
 * Returns an empty list if no obvious match — caller should keep the full
 * component catalog in its default registry order.
 */
export function inferMentionedComponentTypes(prompt: string): string[] {
  if (!prompt) return [];
  const lower = prompt.toLowerCase();
  const registryTypes = Object.keys(uiCompRegistry);
  const candidates = Array.from(new Set([...LOWCODER_COMPONENT_TYPES, ...registryTypes]));
  const aliases: Record<string, string> = {
    chatbox: "chatBox",
    "chat box": "chatBox",
    "chat-box": "chatBox",
    "chat controller": "chatController",
    "chat-controller": "chatController",
    "ai chat": "chat",
    dropdown: "select",
    "list view": "listView",
    "list-view": "listView",
    "number input": "numberInput",
    "text area": "textArea",
    textarea: "textArea",
    textbox: "input",
    "text field": "input",
    img: "image",
    pic: "image",
    picture: "image",
    tabs: "tabbedContainer",
    "tab container": "tabbedContainer",
    "tabbed container": "tabbedContainer",
    graph: "chart",
    nav: "navigation",
    navbar: "navigation",
    stepper: "step",
  };
  const found = new Set<string>();
  for (const c of candidates) {
    const manifest = uiCompRegistry[c];
    const names = [
      c,
      manifest?.name,
      manifest?.enName,
    ].filter(Boolean) as string[];
    if (names.some((name) => lower.includes(name.toLowerCase()))) found.add(c);
  }
  for (const [alias, real] of Object.entries(aliases)) {
    if (lower.includes(alias)) found.add(real);
  }
  return Array.from(found);
}
