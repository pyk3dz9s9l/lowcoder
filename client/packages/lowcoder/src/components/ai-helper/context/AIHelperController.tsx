import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AIHelperApplyAction, AIHelperTarget } from "../types";

export type AIHelperApplyCallback = (
  action: AIHelperApplyAction,
  target: AIHelperTarget
) => void;

export interface AIHelperOpenOptions {
  target: AIHelperTarget;
  onApply?: AIHelperApplyCallback;
}

interface AIHelperState {
  open: boolean;
  target?: AIHelperTarget;
  helperQueryName: string;
}

interface AIHelperContextValue extends AIHelperState {
  openHelper: (opts: AIHelperOpenOptions) => void;
  closeHelper: () => void;
  setOpen: (open: boolean) => void;
  setHelperQueryName: (name: string) => void;
  applyResult: (action: AIHelperApplyAction) => void;
}

const AIHelperContext = createContext<AIHelperContextValue | null>(null);

const HELPER_QUERY_STORAGE_KEY = "lc_ai_helper.query_name";

function readPersistedQueryName(): string {
  try {
    return localStorage.getItem(HELPER_QUERY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writePersistedQueryName(name: string) {
  try {
    if (name) {
      localStorage.setItem(HELPER_QUERY_STORAGE_KEY, name);
    } else {
      localStorage.removeItem(HELPER_QUERY_STORAGE_KEY);
    }
  } catch {
    // Local storage can be unavailable in embedded/private contexts.
  }
}

export function AIHelperProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIHelperState>(() => ({
    open: false,
    helperQueryName: readPersistedQueryName(),
  }));
  const applyRef = useRef<AIHelperApplyCallback | null>(null);

  const openHelper = useCallback((opts: AIHelperOpenOptions) => {
    applyRef.current = opts.onApply ?? null;
    setState((s) => ({
      ...s,
      open: true,
      target: opts.target,
    }));
  }, []);

  const closeHelper = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, open }));
    if (!open) applyRef.current = null;
  }, []);

  const setHelperQueryName = useCallback((name: string) => {
    writePersistedQueryName(name);
    setState((s) => ({ ...s, helperQueryName: name }));
  }, []);

  const applyResult = useCallback(
    (action: AIHelperApplyAction) => {
      if (!state.target) return;
      applyRef.current?.(action, state.target);
    },
    [state.target]
  );

  const value = useMemo<AIHelperContextValue>(
    () => ({
      ...state,
      openHelper,
      closeHelper,
      setOpen,
      setHelperQueryName,
      applyResult,
    }),
    [state, openHelper, closeHelper, setOpen, setHelperQueryName, applyResult]
  );

  return (
    <AIHelperContext.Provider value={value}>
      {children}
    </AIHelperContext.Provider>
  );
}

export function useAIHelper() {
  return useContext(AIHelperContext);
}

