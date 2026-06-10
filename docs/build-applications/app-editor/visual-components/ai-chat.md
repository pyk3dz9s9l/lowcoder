# AI Chat

The component **AI Chat** (`chatComp`) is a thread-based AI conversation component.

It provides:

- built-in thread management
- built-in message history
- a message composer
- optional attachments
- message editing and regeneration
- a selected Lowcoder query as the assistant backend

## What AI Chat Does

`AI Chat` is meant for assistant-style conversations rather than room-based team chat.

It already handles:

- creating a new thread
- switching threads
- renaming threads
- archiving threads
- deleting threads
- appending user messages
- appending assistant messages
- regenerating the assistant response when a user edits a previous message

So the component gives you the conversation UI and thread UX.

Your selected query gives it the assistant logic.

## Core Idea

At a high level:

1. the user sends a message
2. the component stores that user message in the active thread
3. the selected query is executed
4. the query returns the assistant response
5. the assistant response is appended to the same thread

That means the component is query-driven.

## Main Properties

The most important properties are:

- `chatQuery`
- `systemPrompt`
- `placeholder`
- `leftPanelWidth`

### `chatQuery`

This is the Lowcoder query the component runs when the user sends or edits a message.

This is the central integration point.

### `systemPrompt`

This is the system instruction for the assistant.

It is also prepended to the exposed `conversationHistory`, so the external logic can receive the same instruction context as the visible chat session.

### `placeholder`

This controls the composer placeholder text.

### `leftPanelWidth`

This controls the width of the thread sidebar.

## Exposed Variables

The component exposes:

- `{{ chat1.currentMessage }}`
- `{{ chat1.conversationHistory }}`
- `{{ chat1.databaseName }}`

### `currentMessage`

This is the latest user message text.

Use it when you need to log or react to the most recent prompt.

### `conversationHistory`

This is the complete conversation history with the system prompt already included.

The shape looks like:

```js
[
  { role: "system", content: "You are a helpful assistant.", timestamp: ... },
  { role: "user", content: "Hello", timestamp: ... },
  { role: "assistant", content: "Hi there", timestamp: ... }
]
```

This is the most useful exposed value when:

- sending full context to an AI API
- logging full transcripts
- saving session snapshots
- reconstructing prompt context externally

### `databaseName`

This exposes the internal local storage database name used by the component.

It is mainly for inspection and debugging.

## Query Contract

When `AI Chat` runs the selected query, it passes:

```js
args.message.value
args.prompt.value
```

Where:

- `args.message.value` is the full message object
- `args.prompt.value` is the plain user text

Useful values available to the query or surrounding app logic:

```js
{{ args.prompt.value }}
{{ args.message.value }}
{{ chat1.currentMessage }}
{{ chat1.conversationHistory }}
```

## Expected Query Response

The selected query should return a result where:

```js
result.message
```

contains the assistant response object.

Recommended response shape:

```json
{
  "message": {
    "content": "Assistant reply text"
  }
}
```

That is the safest shape because the component expects the assistant reply text at:

```js
message.content
```

## Minimal Working Setup

The smallest working setup is:

1. add `chat1` to the canvas
2. select a query in `chat1.chatQuery`
3. optionally set `systemPrompt`
4. make sure the query returns:

```json
{
  "message": {
    "content": "assistant reply"
  }
}
```

That is enough for the component to function.

## Typical Query Patterns

### Latest Prompt Only

Use:

```js
{{ args.prompt.value }}
```

This is enough for single-turn or simple assistant behavior.

### Full Message Object

Use:

```js
{{ args.message.value }}
```

This is useful when you want:

- attachments
- message metadata
- richer assistant pipelines

### Full Conversation Context

Use:

```js
{{ chat1.conversationHistory }}
```

This is useful when you want:

- multi-turn context
- memory-like behavior
- transcript-aware prompt building

## Send Flow

When the user sends a message:

1. the component validates that the message is not empty
2. it creates a user message object
3. it stores the user message in the active thread
4. it runs the selected query
5. it reads the returned assistant response
6. it appends the assistant message to the thread

If the handler fails, the component appends a fallback assistant error message.

## Editing And Regeneration

The component supports editing a previous user message.

When that happens:

1. the thread is truncated after the edited point
2. the new edited user message is inserted
3. the selected query is run again
4. the new assistant reply is appended

This gives a regeneration flow similar to modern AI chat tools.

## Built-In Events

The component emits:

- `componentLoad`
- `messageSent`
- `messageReceived`
- `threadCreated`
- `threadUpdated`
- `threadDeleted`

These events are useful for:

- analytics
- logging
- persistence
- workflow triggers
- usage tracking

## Recommended Event Usage

### `componentLoad`

Use this when you want to:

- log component usage
- initialize related state
- preload data used by the selected query

### `messageSent`

Use this when you want to:

- log the latest user prompt
- persist transcript snapshots
- trigger external workflows

Useful values:

```js
{{ chat1.currentMessage }}
{{ chat1.conversationHistory }}
```

### `messageReceived`

Use this when you want to:

- log assistant replies
- persist the updated conversation
- trigger downstream automations after an answer is generated

### `threadCreated`

Use this when you want to:

- create external metadata for a new thread
- sync thread creation to another store

### `threadUpdated`

Use this when you want to:

- react to rename or archive changes
- keep an external thread registry updated

### `threadDeleted`

Use this when you want to:

- remove or archive external thread metadata

## Attachments

The component supports attachments, including images and file metadata.

If attachments are present, they are available through:

```js
{{ args.message.value.attachments }}
```

This lets your query inspect uploaded files and build richer assistant flows.

Typical examples:

- image-aware prompts
- file analysis workflows
- multimodal processing pipelines

## Thread Model

The component is thread-based rather than room-based.

That means:

- it is great for assistant conversations
- it is not intended to replace a multi-user room chat UI like **Chat Box**

Use **AI Chat** when you want:

- one user talking to an assistant
- multi-thread assistant conversations
- prompt/response workflows
- document-aware or tool-aware assistant interfaces

Use **Chat Box** when you want:

- room-based collaboration
- multiple human participants
- invites, presence, and typing in shared rooms

## Internal Storage

The component manages its own thread and message storage internally, so you do not need to build a thread store just to get a working AI chat experience.

If you want to connect it to external systems, the usual extension points are:

- the selected query
- the exposed variables
- the component events

## Recommended Mental Model

Think of **AI Chat** like this:

- the component manages the conversation UI and thread state
- the selected query acts as the assistant brain
- `conversationHistory` is the context bridge
- `messageSent` and `messageReceived` are your workflow hooks

## Summary

- **AI Chat** is a thread-aware assistant conversation component
- the selected query is responsible for generating assistant replies
- the component exposes `currentMessage` and `conversationHistory`
- the query receives `args.message.value` and `args.prompt.value`
- the query should return `message.content`
- attachments and thread events make it suitable for more advanced assistant flows
