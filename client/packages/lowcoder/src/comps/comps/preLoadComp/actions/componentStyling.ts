import { message } from "antd";
import { ActionConfig, ActionExecuteParams } from "../types";

// Fallback constant style object to apply if the model returns invalid JSON.
// This is a safety net only — real values always come from the LLM payload.
const FALLBACK_STYLE_OBJECT = {
  fontSize: "10px",
  fontWeight: "500",
  color: "#333333",
  backgroundColor: "#ffffff",
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ddd",
};

// Reserved keys in the style payload that are NOT real style fields. Used to
// disambiguate which `*Style` namespace a flat object should be routed to.
const RESERVED_KEYS = new Set(["_target", "_namespace"]);

/**
 * Resolve the children object that holds the component's style namespaces.
 *
 * Most leaf components store their style children directly on
 * `comp.children.comp.children` (e.g. `style`, `labelStyle`, `animationStyle`).
 * Some composite components (form/list/etc.) wrap them under a sub-component
 * keyed by the `compType` value, so we look there as a fallback.
 */
function resolveStyleChildrenRoot(comp: any): any {
  const innerChildren = comp?.children?.comp?.children;
  if (!innerChildren) return null;

  if (innerChildren.style) return innerChildren;

  const compType = comp?.children?.compType?.getView?.();
  const wrapper = compType ? innerChildren[compType] : null;
  if (wrapper?.children) return wrapper.children;

  return innerChildren;
}

/**
 * Collect every style-like child container exposed by the component, keyed by
 * its name. Recognises `style` plus any sibling whose name ends with `Style`
 * (e.g. `labelStyle`, `inputFieldStyle`, `disabledStyle`, `animationStyle`,
 * `headerStyle`, `bodyStyle`, …).
 */
function collectStyleNamespaces(rootChildren: any): Record<string, any> {
  if (!rootChildren) return {};
  const out: Record<string, any> = {};
  for (const key of Object.keys(rootChildren)) {
    if (key === "style" || key.endsWith("Style")) {
      out[key] = rootChildren[key];
    }
  }
  return out;
}

/**
 * Apply a single style key/value to the first namespace that owns it.
 *
 * Routing order:
 *   1. The explicit `_target` namespace (when provided).
 *   2. `style` (if present and contains the key).
 *   3. Any other `*Style` namespace, in declaration order.
 *
 * Returns `true` when the value was applied, `false` otherwise so the caller
 * can collect a useful warning.
 */
function applyStyleKey(
  namespaces: Record<string, any>,
  styleKey: string,
  styleValue: unknown,
  preferredTarget?: string
): { applied: boolean; namespace?: string } {
  const tryNamespace = (nsName: string): boolean => {
    const ns = namespaces[nsName];
    if (!ns) return false;

    // Most style controls expose nested `children[styleKey]`.
    const nested = ns.children?.[styleKey];
    if (nested?.dispatchChangeValueAction) {
      nested.dispatchChangeValueAction(styleValue);
      return true;
    }
    // Older style controls expose the key directly on the namespace object.
    const direct = ns[styleKey];
    if (direct?.dispatchChangeValueAction) {
      direct.dispatchChangeValueAction(styleValue);
      return true;
    }
    return false;
  };

  if (preferredTarget && namespaces[preferredTarget]) {
    if (tryNamespace(preferredTarget)) {
      return { applied: true, namespace: preferredTarget };
    }
  }

  if (namespaces.style && tryNamespace("style")) {
    return { applied: true, namespace: "style" };
  }

  for (const nsName of Object.keys(namespaces)) {
    if (nsName === "style") continue;
    if (preferredTarget && nsName === preferredTarget) continue;
    if (tryNamespace(nsName)) {
      return { applied: true, namespace: nsName };
    }
  }

  return { applied: false };
}

export const applyStyleAction: ActionConfig = {
  key: "apply-style",
  label: "Apply style to component",
  category: "styling",
  requiresEditorComponentSelection: true,
  requiresStyle: true,
  requiresInput: true,
  inputPlaceholder: "Enter CSS styles (JSON format)",
  inputType: "textarea",
  validation: (value: string) => {
    if (!value.trim()) return "Styles are required";
    return null;
  },
  execute: async (params: ActionExecuteParams) => {
    const { selectedEditorComponent, actionValue, editorState } = params;

    if (!selectedEditorComponent || !editorState) {
      message.error("Component and editor state are required");
      return;
    }

    let styleObject: Record<string, any> = {};
    let usingFallback = false;

    try {
      if (typeof actionValue === "string") {
        styleObject = JSON.parse(actionValue);
      } else {
        styleObject = (actionValue as any) || {};
      }
    } catch (e) {
      styleObject = FALLBACK_STYLE_OBJECT;
      usingFallback = true;
    }

    if (!styleObject || typeof styleObject !== "object") {
      message.error("Invalid style payload");
      return;
    }

    const comp = editorState.getUICompByName(selectedEditorComponent);
    if (!comp) {
      message.error(`Component "${selectedEditorComponent}" not found`);
      return;
    }

    const rootChildren = resolveStyleChildrenRoot(comp);
    const namespaces = collectStyleNamespaces(rootChildren);

    if (Object.keys(namespaces).length === 0) {
      message.warning(
        `Component "${selectedEditorComponent}" has no style controls.`
      );
      return;
    }

    const preferredTarget =
      typeof styleObject._target === "string"
        ? styleObject._target
        : typeof styleObject._namespace === "string"
        ? styleObject._namespace
        : undefined;

    const appliedStyles: string[] = [];
    const skipped: string[] = [];

    for (const [styleKey, styleValue] of Object.entries(styleObject)) {
      if (RESERVED_KEYS.has(styleKey)) continue;
      try {
        const { applied } = applyStyleKey(
          namespaces,
          styleKey,
          styleValue,
          preferredTarget
        );
        if (applied) {
          appliedStyles.push(styleKey);
        } else {
          skipped.push(styleKey);
        }
      } catch (error) {
        console.error(`Error applying style ${styleKey}:`, error);
        skipped.push(styleKey);
      }
    }

    if (skipped.length > 0) {
      console.warn(
        `[applyStyleAction] keys not found on "${selectedEditorComponent}":`,
        skipped,
        "available namespaces:",
        Object.keys(namespaces)
      );
    }

    if (appliedStyles.length > 0) {
      editorState.setSelectedCompNames(
        new Set([selectedEditorComponent]),
        "applyStyle"
      );

      const prefix = usingFallback ? "fallback " : "";
      message.success(
        `Applied ${appliedStyles.length} ${prefix}style(s) to "${selectedEditorComponent}": ${appliedStyles.join(", ")}`
      );
    } else {
      message.warning(
        "No styles were applied. Check if the keys match the component's style fields."
      );
    }
  },
};
