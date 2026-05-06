# Lowcoder Automator

A query-driven, context-aware AI assistant that builds Lowcoder apps for you.

The Automator lives in the bottom panel under **Lowcoder AI**. You pick a
Lowcoder query that talks to your favourite LLM (OpenAI, Anthropic, Ollama,
…), type a request in plain English, and it returns a structured set of
actions that mutate the canvas — placing components, configuring forms,
nesting modals, and so on.

---

## How the flow works (tool-calling)

```
                 ┌────────────────────────────┐
                 │ User types in chat panel   │
                 └────────────┬───────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────┐
   │ buildAutomatorPayload()                            │
   │  - snapshot of current editor (components/queries) │
   │  - lean system prompt + actions catalog            │
   │  - curated component cheatsheet                    │
   │  - conversation history                            │
   │  - OpenAI tool definitions (execute_automator_…)   │
   └────────────┬───────────────────────────────────────┘
                │ messages, tools, context, …
                ▼
   ┌────────────────────────────────────────────────────┐
   │  YOUR Lowcoder JS query (the "model bridge")       │
   │  Forwards messages + tools to an HTTP query        │
   └────────────┬───────────────────────────────────────┘
                │ { message: { role, content, tool_calls } }
                ▼
   ┌────────────────────────────────────────────────────┐
   │ parseResponse()                                    │
   │  1. tool_calls present? → extract actions (clean)  │
   │  2. fallback → legacy JSON text extraction          │
   └────────────┬───────────────────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────────────────┐
   │ ChatPanelContainer.performAction()                 │
   │  - dispatches each action through the existing     │
   │    add/nest/move/resize/configure executors        │
   └────────────────────────────────────────────────────┘
```

The model uses **tool calling** (function calling) instead of embedding
JSON in its text. When the model wants to act on the canvas, it calls the
`execute_automator_actions` tool with `{ explanation, actions }` — the API
guarantees valid JSON. When it needs clarification, it responds with plain
text (no tool call). No custom parsing needed.

Everything is **client-side**. The only thing you wire on the backend is
the LLM HTTP call — through a regular Lowcoder data query.

---

## Setting up the model bridge (queries)

You need exactly **two queries** in your app: one HTTP query that talks to
the LLM, and one JS query that the Automator panel calls.

### 1. The HTTP query — `llmHttp`

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `https://api.openai.com/v1/chat/completions` |
| Headers | `Authorization: Bearer YOUR_KEY`, `Content-Type: application/json` |
| Body | see below |

Body (raw JSON, with Lowcoder bindings):

```json
{
  "model": "gpt-4o-mini",
  "temperature": 0.2,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```

> The `tools` parameter tells the model about `execute_automator_actions`.
> The model decides when to call it vs. when to respond with plain text.

#### Ollama variant

```json
{
  "model": "llama3.1",
  "stream": false,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```
URL: `http://localhost:11434/api/chat`

#### Anthropic variant

Anthropic uses a slightly different tool format. Map the OpenAI tool
definition to Anthropic's `tools` shape in your JS query:

```json
{
  "model": "claude-3-5-sonnet-latest",
  "max_tokens": 4096,
  "system": "{{ system.value }}",
  "messages": {{ messagesWithoutSystem.value }},
  "tools": [{
    "name": "execute_automator_actions",
    "description": "Execute Lowcoder Automator actions on the canvas.",
    "input_schema": {{ JSON.stringify(tools.value[0].function.parameters) }}
  }]
}
```
URL: `https://api.anthropic.com/v1/messages`,
headers: `x-api-key: YOUR_KEY`, `anthropic-version: 2023-06-01`.

### 2. The JS query — `assistantBridge`

This is the query you select in the Automator panel's "Query:" dropdown.
It forwards messages + tools to your HTTP query and returns the response.

```js
return llmHttp.run({
  messages: messages.value,
  tools: tools.value,
}).then((data) => {
  const msg = data?.choices?.[0]?.message;
  return {
    message: {
      role: "assistant",
      content: msg?.content || "",
      tool_calls: msg?.tool_calls || [],
    },
  };
});
```

Now in the bottom panel, switch to **Lowcoder AI**, pick `assistantBridge`
in the Query dropdown, and start chatting. The **Automator** toggle next to
the dropdown controls whether the system prompt + live context + tools are
injected (default: ON).

### Legacy setup (still works)

If you have existing queries that don't pass `tools` and rely on the model
embedding JSON in its text content, they still work. The parser falls back
to the old text-extraction logic automatically. But the tool-calling path
is recommended — it's more reliable and simpler to set up.

---

## What gets sent to your JS query

Inside the JS query you can use any of these args:

| Arg | What it is |
| --- | --- |
| `messages` | Final OpenAI-style message array, prefixed with the Automator system prompt and live editor context. **The default and recommended choice.** |
| `tools` | OpenAI-compatible tool definitions array. Pass this to the HTTP body alongside `messages`. |
| `messagesWithoutSystem` | Same array minus the leading `system` message. Use with Anthropic. |
| `system` | The composed system prompt string by itself. |
| `context` | The live editor snapshot (components, queries, canvas grid, selected). |
| `actionsCatalog` | The catalog of allowed actions. |
| `componentCatalog` | The curated cheatsheet of component shapes. |
| `prompt` | The latest user message text only. |
| `conversationHistory` | The full ChatMessage history including IDs/timestamps. |
| `sessionId` | Current chat thread id (useful for server-side memory). |
| `message` | The full latest user `ChatMessage` object. |

---

## What the model returns

### With tool calling (recommended)

When the model wants to act, it returns a `tool_calls` array:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I'll create a basic Todo app with a title, input, button, and table.",
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "execute_automator_actions",
          "arguments": "{\"explanation\":\"Creating a Todo app...\",\"actions\":[{\"action\":\"place_component\",\"component\":\"text\",\"component_name\":\"todoTitle\",\"layout\":{\"x\":0,\"y\":0,\"w\":24,\"h\":4},\"action_parameters\":{\"text\":\"## My Todos\",\"type\":\"markdown\"}}]}"
        }
      }]
    }
  }]
}
```

When the model needs clarification, it responds with just text (no tool calls):

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I can build that for you. Would you like:\n- A simple table view?\n- A kanban board layout?\n\nPlease confirm and I'll proceed."
    }
  }]
}
```

### Legacy (text JSON)

A single JSON object in the text content:

```json
{
  "explanation": "Created a basic Todo app.",
  "actions": [...]
}
```

---

## Supported actions

See `actionsCatalog.ts` for the full list with examples. Summary:

| Action | Purpose |
| --- | --- |
| `place_component` | New component on the root canvas |
| `nest_component` | New component inside an existing container |
| `move_component` | Reposition an existing component |
| `resize_component` | Resize an existing component |
| `delete_component` | Remove an existing component |
| `rename_component` | Rename an existing component |
| `align_component` | Align a component (left / center / right) |
| `set_properties` | Update properties on an existing component |
| `set_style` | Apply visual styles to a component |
| `add_event_handler` | Add an event handler (click, change, etc.) |
| `set_theme` | Apply a theme |
| `set_app_metadata` | Update app title / description |
| `set_canvas_setting` | Update grid columns / row height / max width |
| `set_global_css` | Set global CSS for the app |
| `set_global_javascript` | Set global JS that runs on load |
| `publish_app` | Publish the app for end-users |

Adding a new action is a two-step change:
1. Add an entry to the `ACTION_REGISTRY` map in `ChatPanelContainer.tsx`.
2. Add an entry to `ACTIONS_CATALOG` in `actionsCatalog.ts`.

---

## Test plan / quick smoke

1. In a fresh app, create the two queries above (`llmHttp`, `assistantBridge`).
2. Open the bottom panel → **Lowcoder AI** → pick `assistantBridge`.
3. Type: **`build a basic todo app`**.
4. Expect: a brief explanation + 3-5 components placed on the canvas.
5. Type: **`add a delete button column to the table`** → it should reuse the
   existing `todoTable` name (this is the "context awareness" win).
6. Toggle **Automator** off → send a message → the JS query receives only
   the raw conversation history, no tools, no system prompt (useful for
   plain ChatGPT-style flows).

---

## Architecture

| File | Purpose |
| --- | --- |
| `systemPrompt.ts` | Short, stable rules for the model |
| `actionsCatalog.ts` | Machine-readable list of all supported actions |
| `componentCatalog.ts` | Curated cheatsheet (only relevant types sent per turn) |
| `editorSnapshot.ts` | Live context from `EditorState` (components, queries, canvas) |
| `toolDefinitions.ts` | OpenAI-compatible tool definitions for function calling |
| `responseParser.ts` | Dual-path parser: tool_calls (clean) → text fallback (legacy) |
| `orchestrator.ts` | Assembles system + context + history + tools into the payload |

`ChatPanelContainer.tsx` holds the `ACTION_REGISTRY` — a simple map from
action names to executor functions.
