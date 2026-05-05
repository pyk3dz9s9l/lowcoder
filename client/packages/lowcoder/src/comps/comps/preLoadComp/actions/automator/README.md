# Lowcoder Automator

A query-driven, context-aware AI assistant that builds Lowcoder apps for you.

The Automator lives in the bottom panel under **Lowcoder AI**. You pick a
Lowcoder query that talks to your favourite LLM (OpenAI, Anthropic, Ollama,
…), type a request in plain English, and it returns a structured set of
actions that mutate the canvas — placing components, configuring forms,
nesting modals, and so on.

---

## How the flow works

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
   └────────────┬───────────────────────────────────────┘
                │ messages = [system, ...history]
                │ context, system, actionsCatalog, ...
                ▼
   ┌────────────────────────────────────────────────────┐
   │  YOUR Lowcoder JS query (the "model bridge")       │
   │  e.g. forwards `messages` to an OpenAI HTTP query  │
   └────────────┬───────────────────────────────────────┘
                │ { message: { role, content } }
                ▼
   ┌────────────────────────────────────────────────────┐
   │ parseAutomatorResponse()                           │
   │  - extracts JSON `{ explanation, actions }`        │
   │  - tolerates ```json fences and prose noise        │
   │  - validates actions against the supported set     │
   └────────────┬───────────────────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────────────────┐
   │ ChatPanelContainer.performAction()                 │
   │  - dispatches each action through the existing     │
   │    add/nest/move/resize/configure executors        │
   └────────────────────────────────────────────────────┘
```

Everything is **client-side**. The only thing you wire on the backend is
the LLM HTTP call — through a regular Lowcoder data query.

---

## Setting up the model bridge (queries)

You need exactly **two queries** in your app: one HTTP query that talks to
the LLM, and one JS query that the Automator panel calls.

### 1. The HTTP query — `llmHttp`

This one talks to the LLM provider. Examples below use OpenAI; swap the URL
and headers for Ollama / Anthropic / Together / Groq.

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
  "response_format": { "type": "json_object" },
  "messages": {{ messages.value }}
}
```

> Tip: `response_format: json_object` is the OpenAI-only switch that forces
> a single JSON object reply. With Anthropic or Ollama you can drop it; the
> Automator's parser tolerates fenced ```json blocks too.

#### Ollama variant

```json
{
  "model": "llama3.1",
  "stream": false,
  "format": "json",
  "messages": {{ messages.value }}
}
```
URL: `http://localhost:11434/api/chat`

#### Anthropic variant

```json
{
  "model": "claude-3-5-sonnet-latest",
  "max_tokens": 4096,
  "system": "{{ system.value }}",
  "messages": {{ messagesWithoutSystem.value }}
}
```
URL: `https://api.anthropic.com/v1/messages`,
headers: `x-api-key: YOUR_KEY`, `anthropic-version: 2023-06-01`.

### 2. The JS query — `assistantBridge`

This is the query you select in the Automator panel's "Query:" dropdown.
All it does is forward the prompt to your HTTP query and unwrap the reply.

```js
return llmHttp.run({
  messages: messages.value,        // already includes the system prompt
}).then((data) => ({
  message: {
    role: "assistant",
    // OpenAI: data.choices[0].message.content
    // Ollama: data.message.content
    // Anthropic: data.content[0].text
    content: data?.choices?.[0]?.message?.content
          || data?.message?.content
          || data?.content?.[0]?.text
          || "No response from model.",
  },
}));
```

Now in the bottom panel, switch to **Lowcoder AI**, pick `assistantBridge`
in the Query dropdown, and start chatting. The **Automator** toggle next to
the dropdown controls whether the system prompt + live context is injected
(default: ON).

---

## What gets sent to your JS query

Inside the JS query you can use any of these args:

| Arg | What it is |
| --- | --- |
| `messages` | Final OpenAI-style message array, already prefixed with the Automator system prompt and live editor context. **The default and recommended choice.** |
| `messagesWithoutSystem` | Same array minus the leading `system` message. Use with Anthropic. |
| `system` | The composed system prompt string by itself. |
| `context` | The live editor snapshot (components, queries, canvas grid, selected). |
| `actionsCatalog` | The catalog of allowed actions (so you can show it in tooltips, etc). |
| `componentCatalog` | The curated cheatsheet of component shapes. |
| `prompt` | The latest user message text only. |
| `conversationHistory` | The full ChatMessage history including IDs/timestamps. |
| `sessionId` | Current chat thread id (useful for server-side memory). |
| `message` | The full latest user `ChatMessage` object. |

---

## What the model is expected to return

A single JSON object — no prose, no fences:

```json
{
  "explanation": "Created a basic Todo app with title, input, button and table.",
  "actions": [
    {
      "action": "place_component",
      "component": "text",
      "component_name": "todoTitle",
      "layout": { "x": 0, "y": 0, "w": 24, "h": 4 },
      "action_parameters": { "text": "## My Todos", "type": "markdown" }
    },
    {
      "action": "place_component",
      "component": "input",
      "component_name": "newTodoInput",
      "layout": { "x": 0, "y": 4, "w": 18, "h": 6 },
      "action_parameters": {
        "label": { "text": "New task", "position": "row" },
        "placeholder": "What needs doing?"
      }
    },
    {
      "action": "place_component",
      "component": "button",
      "component_name": "addTodoBtn",
      "layout": { "x": 18, "y": 4, "w": 6, "h": 6 },
      "action_parameters": { "text": "Add", "type": "primary" }
    },
    {
      "action": "place_component",
      "component": "table",
      "component_name": "todoTable",
      "layout": { "x": 0, "y": 10, "w": 24, "h": 30 },
      "action_parameters": {
        "columns": [
          { "title": "Task",   "dataIndex": "task",   "render": { "compType": "text", "comp": { "text": "{{currentCell}}" } } },
          { "title": "Status", "dataIndex": "status", "render": { "compType": "text", "comp": { "text": "{{currentCell}}" } } }
        ],
        "data": "[{\"task\":\"Buy groceries\",\"status\":\"Pending\"}]"
      }
    }
  ]
}
```

The Automator parses this, executes every action, and shows the
`explanation` in the chat with a small footer like
`— Automator: 4 actions executed`.

If the model says "actions: []" with a bullet-point plan, that's the
clarification flow — you reply "go ahead" (or with corrections) and it
returns a real action list on the next turn.

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
   the raw conversation history (useful for plain ChatGPT-style flows).

---

## Supported component types

The component catalog (`componentCatalog.ts`) includes 30 types:

`text`, `button`, `input`, `numberInput`, `textArea`, `password`, `select`,
`checkbox`, `radio`, `switch`, `slider`, `rating`, `date`, `form`,
`container`, `modal`, `drawer`, `table`, `listView`, `card`,
`tabbedContainer`, `image`, `video`, `avatar`, `chart`, `progress`,
`navigation`, `timeline`, `step`, `divider`

The model can use any component type registered in Lowcoder, even if it's
not in the catalog — the catalog just provides property hints and defaults.

---

## Architecture (how it replaces `Latest_prompt.md`)

The old `Latest_prompt.md` (4.7K lines) was pasted into n8n manually. It
couldn't see the canvas, shipped a massive component catalog every turn,
and duplicated rules dozens of times.

The Automator splits that into small, focused modules:

| File | Purpose |
| --- | --- |
| `systemPrompt.ts` | Short, stable rules for the model |
| `actionsCatalog.ts` | Machine-readable list of all supported actions |
| `componentCatalog.ts` | Curated cheatsheet (only relevant types sent per turn) |
| `editorSnapshot.ts` | Live context from `EditorState` (components, queries, canvas) |
| `responseParser.ts` | Robust JSON extraction from model output |
| `orchestrator.ts` | Assembles system + context + history into the message array |

`ChatPanelContainer.tsx` holds the `ACTION_REGISTRY` — a simple map from
action names to executor functions. Adding a new action is one line there
plus one catalog entry.

The legacy `Latest_prompt.md` is kept as reference only — nothing imports it.
