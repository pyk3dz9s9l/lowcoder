import { HookComp } from "comps/hooks/hookComp";
import { EditorState } from "comps/editorState";
import { singletonHookComp } from "comps/hooks/hookCompTypes";
import { wrapActionExtraInfo } from "lowcoder-core";
import { messageInstance } from "lowcoder-design";
import { trans } from "i18n";
import {
  writeHookOnlyToClipboard,
  type ClipboardHookItem,
  type LowcoderClipboardPayload,
} from "./gridCompOperator";

export class HookCompOperator {
  static async copyComp(editorState: EditorState): Promise<boolean> {
    const selectedNames = Array.from(editorState.selectedCompNames);
    if (!selectedNames.length) {
      return false;
    }

    const hookComps = editorState.getHooksComp().getView();
    const selectedHookComps = hookComps
      .filter((comp: any) => {
        const name = comp.children.name.getView();
        const compType = comp.children.compType.getView();
        return selectedNames.includes(name) && !singletonHookComp(compType);
      }) as HookComp[];

    if (!selectedHookComps.length) {
      return false;
    }

    const hookItems: ClipboardHookItem[] = selectedHookComps.map((hookComp) => {
      const compType = hookComp.children.compType.getView();
      const name = hookComp.children.name.getView();
      const childComp: any = hookComp.children.comp;
      const baseValue = childComp?.toJsonValue ? childComp.toJsonValue() : {};
      const pasteValue = childComp?.getPasteValue?.(editorState.getNameGenerator()) ?? {};
      const comp = { ...baseValue, ...pasteValue };
      const fullValue = hookComp.toJsonValue();
      return { compType, comp, name, fullValue };
    });

    const written = await writeHookOnlyToClipboard(hookItems);
    if (written) {
      messageInstance.success(trans("gridCompOperator.copyCompsSuccess", { compNum: hookItems.length }));
    } else {
      messageInstance.error(trans("gridCompOperator.clipboardWriteError"));
    }
    return written;
  }

  static pasteFromPayload(editorState: EditorState, payload: LowcoderClipboardPayload): boolean {
    if (payload.hookItems.length === 0) {
      return false;
    }

    const hooksComp = editorState.getHooksComp();
    const nameGenerator = editorState.getNameGenerator();
    const newNames = new Set<string>();

    payload.hookItems.forEach((item) => {
      const newName = nameGenerator.genItemName(item.compType);

      const dispatchPayload = {
        ...(item.fullValue || {}),
        name: newName,
        compType: item.compType,
        comp: item.comp,
      };

      hooksComp.dispatch(
        wrapActionExtraInfo(
          hooksComp.pushAction(dispatchPayload),
          {
            compInfos: [
              {
                type: "add",
                compName: newName,
                compType: item.compType,
              },
            ],
          }
        )
      );
      newNames.add(newName);
    });

    editorState.setSelectedCompNames(newNames, "leftPanel");
    messageInstance.success(trans("gridCompOperator.pasteCompsSuccess", { compNum: newNames.size }));
    return true;
  }
}
