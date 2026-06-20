import { HelpText } from "components/HelpText";
import React, { useEffect } from "react";
import { trans } from "i18n";
import { ConstructorToComp } from "lowcoder-core";
import { ScriptComp, CSSComp } from "./components";
import { runScript } from "./utils";

export function JavaScriptTabPane(props: { comp: ConstructorToComp<typeof ScriptComp> }) {
  useEffect(() => {
    // Use the imported runScript function instead of the component's method to avoid require() issues
    const code = props.comp.getView();
    if (code) {
      runScript(code, false);
    }
  }, [props.comp]);

  const codePlaceholder = `window.name = 'Tom';\nwindow.greet = () => "hello world";`;

  return (
    <>
      <HelpText style={{ marginBottom: 20 }}>{trans("preLoad.jsHelpText")}</HelpText>
      {props.comp.propertyView({
        expandable: false,
        styleName: "window",
        codeType: "Function",
        language: "javascript",
        placeholder: codePlaceholder,
        enableAIHelp: true,
        aiHelp: {
          targetKind: "javascript",
          label: "App JavaScript",
          fieldName: "preloadJavaScript",
          targetId: "preload.script",
          fieldDescription:
            "Application-level JavaScript loaded for the current app. Help generate, explain, or improve global methods and variables that can be used by app logic.",
        },
      })}
    </>
  );
}

export function CSSTabPane(props: { comp: CSSComp, isGlobal?: boolean }) {
  useEffect(() => {
    props.comp.applyAllCSS();
  }, [props.comp]);

  const codePlaceholder = `.top-header {\n  background-color: red; \n}`;

  return (
    <>
      <HelpText style={{ marginBottom: 20 }}>{trans("preLoad.cssHelpText")}</HelpText>
      {props.comp.propertyView({
        expandable: false,
        placeholder: codePlaceholder,
        styleName: "window",
        language: "css",
        enableAIHelp: true,
        aiHelp: {
          label: props.isGlobal ? "App Global CSS" : "App CSS",
          fieldName: props.isGlobal ? "preloadGlobalCSS" : "preloadCSS",
          targetId: props.isGlobal ? "preload.globalCSS" : "preload.css",
          fieldDescription: props.isGlobal
            ? "Global CSS rules for the current app. Help generate, explain, or improve CSS that applies globally."
            : "Application-level CSS rules for the current app. Help generate, explain, or improve CSS for app styling.",
        },
      })}
    </>
  );
} 
