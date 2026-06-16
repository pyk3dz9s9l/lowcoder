# AI Help

AI Help is an AI-assisted editor feature for focused help inside Lowcoder input fields, such as JavaScript, SQL, JSON, and chart option editors.

AI Help is a subscription feature. When it is enabled for your workspace, supported editor fields show an AI Help action that opens the AI Helper panel.

## Bring Your Own Model

Lowcoder does not require a specific AI model for AI Help.

You can connect any model or provider of your choice through a Lowcoder query. This can be an OpenAI-compatible API, a private model gateway, a self-hosted model, or another LLM service. The selected query sends AI Help's request to your provider and converts the provider response into the message format Lowcoder expects.

This lets each workspace choose its own model, endpoint, credentials, data policy, and cost profile.

For the best AI Help experience, choose a model that can follow structured instructions and supports tool or function calling. AI Help can show a normal text explanation without a tool call, but the "apply" action appears only when the model returns the AI Help tool call.

Examples of possible providers include:

- OpenAI or any OpenAI-compatible API
- xAI Grok through an OpenAI-compatible chat completions endpoint
- Ollama with a local model that supports tools
- Anthropic Claude through a small adapter in the JavaScript bridge query
- your own backend that accepts Lowcoder's `messages`, `tools`, and `target` and returns the assistant message shape

## How AI Help Works

When you ask for help in a supported editor field, Lowcoder builds an AI payload and passes it to the selected query as:

```js
{{ ai.value }}
```

The payload contains:

```js
{
  mode: "helper",
  messages: [...],
  tools: [...],
  target: {...}
}
```

The `messages` include the helper system prompt and the conversation. The `tools` describe how the model can offer a result that Lowcoder can apply. The `target` describes the current field, for example whether it is SQL, JavaScript, JSON, an ECharts option, or another supported input.

## Recommended Query Setup

A common setup is to create two queries:

1. an HTTP query that calls your model provider
2. a JavaScript query that acts as the bridge between AI Help and the HTTP query

The JavaScript query is the one you select in the AI Helper panel.

This pattern is useful because the AI Helper UI does not need to know which model provider you use. The HTTP query handles the provider call. The JavaScript bridge normalizes the provider response for Lowcoder.

Before you start, prepare:

- a model endpoint
- any required API key or authentication headers
- a model name
- a Lowcoder HTTP query, for example `llmHttp`
- a Lowcoder JavaScript query, for example `aiBridge`

## HTTP Query

Create an HTTP query, for example `llmHttp`, that points to your model provider endpoint.

For an OpenAI-compatible chat completions API, the request body can look like this:

```json
{
  "model": "gpt-4.1",
  "stream": false,
  "parallel_tool_calls": false,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```

Change the model name, URL, headers, authentication, and request fields to match the provider you use.

## Provider Starting Points

Many providers can use the same HTTP body when they support the OpenAI chat completions format.

### OpenAI-Compatible APIs

Use this style for OpenAI and other providers that expose a compatible `/chat/completions` endpoint:

```json
{
  "model": "your-model-name",
  "stream": false,
  "parallel_tool_calls": false,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```

The JavaScript bridge above can usually stay the same because the response is expected at:

```js
payload.choices?.[0]?.message
```

### Grok

Grok can be used in the same way when you call an OpenAI-compatible xAI chat completions endpoint.

Use your xAI endpoint and API key in the HTTP query, then set the model to the Grok model you want to use:

```json
{
  "model": "grok-...",
  "stream": false,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```

If the response follows the OpenAI-compatible shape, no change is needed in the JavaScript bridge.

### Ollama

Ollama can also be used when your Lowcoder instance can reach the Ollama server and the selected local model supports tools.

For a local setup, the HTTP query usually points to an Ollama OpenAI-compatible endpoint such as:

```text
http://localhost:11434/v1/chat/completions
```

Then use a local model name:

```json
{
  "model": "llama3.1",
  "stream": false,
  "messages": {{ messages.value }},
  "tools": {{ tools.value }}
}
```

In hosted or containerized Lowcoder environments, `localhost` means the Lowcoder container or server, not your laptop. Use a reachable network hostname for Ollama in that case.

### Claude

Claude can be used too, but it does not use the exact same request and response shape as OpenAI-compatible APIs. Keep the same AI Help payload, but adapt it in the JavaScript bridge.

For Claude, the bridge usually needs to:

- move the system message into Claude's top-level `system` field
- convert OpenAI-style tools into Claude tools
- read Claude `text` and `tool_use` response blocks
- return Lowcoder's assistant message shape

A simplified bridge shape looks like this:

```js
const a = ai.value;
const system = a.messages.find((m) => m.role === "system")?.content || "";
const messages = a.messages.filter((m) => m.role !== "system");
const tools = a.tools.map((tool) => ({
  name: tool.function.name,
  description: tool.function.description,
  input_schema: tool.function.parameters,
}));

return claudeHttp
  .run({ system, messages, tools })
  .then((response) => {
    const payload = response?.data || response;
    const blocks = payload.content || [];
    const text = blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const toolUse = blocks.find((block) => block.type === "tool_use");

    if (!toolUse) {
      return {
        role: "assistant",
        content: text ? [{ type: "text", text }] : [],
      };
    }

    const argsText = JSON.stringify(toolUse.input || {});

    return {
      role: "assistant",
      content: [
        ...(text ? [{ type: "text", text }] : []),
        {
          type: "tool-call",
          toolCallId: toolUse.id,
          toolName: toolUse.name,
          args: toolUse.input || {},
          argsText,
        },
      ],
    };
  });
```

The exact HTTP query body depends on the Claude API version and the model you select.

## JavaScript Bridge Query

Create a JavaScript query, for example `aiBridge`, that receives AI Help's payload, calls the HTTP query, and returns an assistant message.

```js
const a = ai.value;

return llmHttp
  .run({
    messages: a.messages,
    tools: a.tools,
  })
  .then((response) => {
    const payload = response?.data || response;
    const msg = payload.choices?.[0]?.message || {};
    const content = msg.content || "";
    const toolCall = msg.tool_calls?.[0];

    if (!toolCall) {
      return {
        role: "assistant",
        content: content ? [{ type: "text", text: content }] : [],
      };
    }

    const argsText = toolCall.function?.arguments || "{}";
    const args = JSON.parse(argsText);

    return {
      role: "assistant",
      content: [
        ...(content ? [{ type: "text", text: content }] : []),
        {
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args,
          argsText,
        },
      ],
    };
  });
```

This bridge can be shared with Automator when both features use the same provider and response format.

## Select the Query

In the App Editor:

1. open AI Help from a supported editor field
2. choose the JavaScript bridge query in the AI query selector
3. ask for help, an explanation, or a generated replacement value
4. apply the suggestion if AI Help returns an apply action

AI Help keeps the conversation focused on the field where it was opened. For example, in a SQL editor it should help write or improve SQL. In a JSON field it should return valid JSON.

## Example Prompts

AI Help is designed for focused field-level work. Useful prompts include:

- "Explain this JavaScript query."
- "Rewrite this SQL query to filter by the selected customer."
- "Generate valid ECharts option JSON for a bar chart."
- "Find the syntax error in this expression."
- "Replace this value with a safer version."

When AI Help returns an apply action, Lowcoder can insert, append, or replace the current field value depending on the tool arguments returned by the model.

## Response Contract

The selected query must return an assistant message:

```js
{
  role: "assistant",
  content: [
    { type: "text", text: "Here is a safer query..." }
  ]
}
```

When the model offers a value that Lowcoder can apply to the current field, include the tool call part returned by the model:

```js
{
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call_123",
      toolName: "apply_ai_helper_result",
      args: {
        label: "Replace SQL",
        value: "select * from orders limit 100",
        mode: "replace",
        language: "sql"
      },
      argsText: "{\"label\":\"Replace SQL\",\"value\":\"select * from orders limit 100\",\"mode\":\"replace\",\"language\":\"sql\"}"
    }
  ]
}
```

The exact tool arguments are generated from the `tools` definition passed to your model.

## Notes

- AI Help is available only when the related subscription feature is enabled.
- You can use any model that can accept the provided messages and tools, or any backend that can translate them.
- Keep provider API keys in datasource or query configuration, not directly in app-visible code.
- If AI Help explains an answer but does not show an apply action, check whether the model returned a tool call.
- If the query fails, test the HTTP query first, then test the JavaScript bridge query.
