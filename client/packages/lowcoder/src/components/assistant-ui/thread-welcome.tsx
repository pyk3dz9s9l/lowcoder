import { ThreadPrimitive } from "@assistant-ui/react";
import type { FC } from "react";
import { trans } from "i18n";

export const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root">
      <div className="aui-thread-welcome-center">
        <div className="aui-thread-welcome-message">
          <h1 className="aui-thread-welcome-message-inner">
            {trans("chat.welcomeMessage")}
          </h1>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions">
      <div className="aui-thread-welcome-suggestion-display">
        <ThreadPrimitive.Suggestion
          className="aui-thread-welcome-suggestion"
          prompt={trans("chat.suggestionWeather")}
          method="replace"
          autoSend
        >
          <span className="aui-thread-welcome-suggestion-text-1">
            {trans("chat.suggestionWeather")}
          </span>
        </ThreadPrimitive.Suggestion>
      </div>
      <div className="aui-thread-welcome-suggestion-display">
        <ThreadPrimitive.Suggestion
          className="aui-thread-welcome-suggestion"
          prompt={trans("chat.suggestionAssistant")}
          method="replace"
          autoSend
        >
          <span className="aui-thread-welcome-suggestion-text-1">
            {trans("chat.suggestionAssistant")}
          </span>
        </ThreadPrimitive.Suggestion>
      </div>
    </div>
  );
};
