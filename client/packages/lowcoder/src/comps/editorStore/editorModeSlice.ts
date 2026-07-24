import type { StateCreator } from "zustand/vanilla";
import { getEditorModeStatus } from "util/localStorageUtil";
import type { EditorStoreState } from "./types";

export type EditorModeSlice = {
  editorModeStatus: string;
  setEditorModeStatus: (editorModeStatus: string) => void;
};

export const createEditorModeSlice: StateCreator<
  EditorStoreState,
  [],
  [],
  EditorModeSlice
> = (set) => ({
  editorModeStatus: getEditorModeStatus(),
  setEditorModeStatus: (editorModeStatus) =>
    set((state) =>
      state.editorModeStatus === editorModeStatus ? state : { editorModeStatus }
    ),
});
