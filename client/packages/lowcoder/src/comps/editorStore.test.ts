import { createEditorStore } from "./editorStore";

describe("editorStore", () => {
  test("updates selection and property pane together", () => {
    const store = createEditorStore();
    const selectedCompNames = new Set(["button1"]);

    store.getState().setSelectedCompNames(selectedCompNames, "leftPanel");

    expect(store.getState().selectedCompNames).toEqual(selectedCompNames);
    expect(store.getState().selectedCompNames).not.toBe(selectedCompNames);
    expect(store.getState().selectSource).toBe("leftPanel");
    expect(store.getState().showPropertyPane).toBe(true);

    store.getState().setSelectedCompNames(new Set());
    expect(store.getState().selectedCompNames.size).toBe(0);
    expect(store.getState().showPropertyPane).toBe(false);
  });

  test("does not notify subscribers for an unchanged selection", () => {
    const store = createEditorStore();
    const subscriber = jest.fn();
    const unsubscribe = store.subscribe(subscriber);

    store.getState().setSelectedCompNames(new Set(["button1"]), "leftPanel");
    store.getState().setSelectedCompNames(new Set(["button1"]), "leftPanel");

    expect(subscriber).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test("creates isolated editor stores", () => {
    const firstStore = createEditorStore();
    const secondStore = createEditorStore();

    firstStore.getState().setSelectedCompNames(new Set(["button1"]));

    expect(firstStore.getState().selectedCompNames).toEqual(new Set(["button1"]));
    expect(secondStore.getState().selectedCompNames.size).toBe(0);
  });
});
