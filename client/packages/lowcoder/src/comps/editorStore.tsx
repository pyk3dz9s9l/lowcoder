import React, { createContext, type PropsWithChildren, useContext } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

export type SelectSourceType =
  | "editor"
  | "leftPanel"
  | "addComp"
  | "rightPanel"
  | "alignComp"
  | "layoutComp"
  | "nestComp"
  | "deleteComp"
  | "moveComp"
  | "renameComp"
  | "resizeComp";

export type EditorStoreState = {
  selectedCompNames: Set<string>;
  selectSource?: SelectSourceType;
  showPropertyPane: boolean;
  setSelectedCompNames: (
    selectedCompNames: Set<string>,
    selectSource?: SelectSourceType
  ) => void;
  setShowPropertyPane: (showPropertyPane: boolean) => void;
};

export type EditorStoreApi = StoreApi<EditorStoreState>;

function areSetsEqual(left: Set<string>, right: Set<string>) {
  return left.size === right.size && Array.from(left).every((name) => right.has(name));
}

export function createEditorStore(): EditorStoreApi {
  return createStore<EditorStoreState>((set) => ({
    selectedCompNames: new Set(),
    selectSource: undefined,
    showPropertyPane: false,
    setSelectedCompNames: (selectedCompNames, selectSource) =>
      set((state) => {
        if (selectedCompNames.size === 0 && state.selectedCompNames.size === 0) {
          return state;
        }

        const showPropertyPane = selectedCompNames.size > 0;
        if (
          areSetsEqual(state.selectedCompNames, selectedCompNames) &&
          state.selectSource === selectSource &&
          state.showPropertyPane === showPropertyPane
        ) {
          return state;
        }

        return {
          selectedCompNames: new Set(selectedCompNames),
          selectSource,
          showPropertyPane,
        };
      }),
    setShowPropertyPane: (showPropertyPane) =>
      set((state) =>
        state.showPropertyPane === showPropertyPane ? state : { showPropertyPane }
      ),
  }));
}

const EditorStoreContext = createContext<EditorStoreApi | undefined>(undefined);

type EditorStoreProviderProps = PropsWithChildren<{
  store: EditorStoreApi;
}>;

export function EditorStoreProvider({ children, store }: EditorStoreProviderProps) {
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>;
}

export function useEditorStore<T>(selector: (state: EditorStoreState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) {
    throw new Error("useEditorStore must be used inside EditorStoreProvider");
  }
  return useStore(store, selector);
}
