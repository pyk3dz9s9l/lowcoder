import { HookComp } from "comps/hooks/hookComp";
import { EditorState } from "comps/editorState";
import { wrapActionExtraInfo, type Comp } from "lowcoder-core";
import { messageInstance } from "lowcoder-design";
import { trans } from "i18n";

type CopyableHookType = "modal" | "drawer";

type CopyableHookComp = HookComp & {
  children: HookComp["children"] & {
    compType: { getView: () => CopyableHookType };
  };
};

const copyableHookTypes = new Set<CopyableHookType>(["modal", "drawer"]);

export class HookCompOperator {
  private static copyHooks: CopyableHookComp[] = [];

  /**
   * Copy modals/drawers by name from selectedCompNames.
   */
  static copyComp(editorState: EditorState, compRecords: Record<string, Comp>) {
    const selectedNames = Array.from(editorState.selectedCompNames);
    if (!selectedNames.length) {
      return false;
    }

    const hookMap = editorState.getHooksComp().getAllCompItems();
    const selectedHookComps = Object.values(hookMap)
      .filter((comp: any) => {
        const name = comp.children.name.getView();
        const compType = comp.children.compType.getView();
        return selectedNames.includes(name) && copyableHookTypes.has(compType);
      }) as CopyableHookComp[];

    if (!selectedHookComps.length) {
      return false;
    }

    this.copyHooks = selectedHookComps;
    messageInstance.success(trans("notification.copySuccess"));
    return true;
  }

  static clearCopy() {
    this.copyHooks = [];
  }

  /**
   * Paste previously copied modals/drawers and re-generate nested component names.
   */
  static pasteComp(editorState: EditorState) {
    if (!this.copyHooks.length) {
      messageInstance.info(trans("gridCompOperator.selectCompFirst"));
      return false;
    }

    const hooksComp = editorState.getHooksComp();
    const nameGenerator = editorState.getNameGenerator();
    const newNames = new Set<string>();

    this.copyHooks.forEach((hookComp) => {
      const compType = hookComp.children.compType.getView();
      const newName = nameGenerator.genItemName(compType);
      const childComp: any = hookComp.children.comp;
      const baseValue = childComp?.toJsonValue ? childComp.toJsonValue() : {};
      const pasteValue =
        childComp?.getPasteValue?.(nameGenerator) ?? {};

      const payload = {
        ...(hookComp.toJsonValue() as any),
        name: newName,
        comp: {
          ...baseValue,
          ...pasteValue,
        },
      };

      hooksComp.dispatch(
        wrapActionExtraInfo(
          hooksComp.pushAction(payload),
          {
            compInfos: [
              {
                type: "add",
                compName: newName,
                compType,
              },
            ],
          }
        )
      );
      newNames.add(newName);
    });

    editorState.setSelectedCompNames(newNames, "leftPanel");
    messageInstance.success(trans("notification.copySuccess"));
    return true;
  }
}

