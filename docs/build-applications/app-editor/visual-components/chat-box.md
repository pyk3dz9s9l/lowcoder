# Chat Box

The component **Chat Box** provides a ready-made chat interface for room-based conversations.

It includes:

- a message list
- a message composer
- a rooms sidebar
- typing indicators
- online user indicators
- room creation and leave actions
- invite actions for private rooms

It is designed to work best together with **Chat Controller**, while your own queries handle the actual room and message records.

## What Chat Box Does

`Chat Box` is the UI layer for a chat application.

It renders:

- the currently active room
- the messages for that room
- the sidebar of rooms
- typing users
- room-level online presence
- create, leave, and invite interactions

It does **not** persist messages or rooms by itself.

Instead, the usual architecture is:

- **Chat Box** handles chat UI and emits events
- **Chat Controller** handles realtime collaboration state
- **Queries** load and save rooms, invites, and messages

## Recommended Architecture

The most common pairing is:

- `chatBox1`
- `chatController1`
- `loadRooms`
- `loadMessages`
- `saveMessage`
- optional room and invite queries

In that setup:

- `chatController1.currentRoomId` is the active room source of truth
- `chatBox1` is bound to the room and message data from your queries
- `chatBox1` events trigger controller methods and data queries

## Core Bindings

Bind the component like this.

### Content Bindings

`Messages`

```js
{{ loadMessages.data || [] }}
```

`Current User ID`

```js
{{ chatController1.userId }}
```

`Current User Name`

```js
{{ chatController1.userName }}
```

### Realtime Bindings

`Typing Users`

```js
{{ chatController1.typingUsers }}
```

`Online Users`

```js
{{ chatController1.onlineUsers }}
```

`AI Is Thinking`

```js
{{ !!chatController1.aiThinkingRooms?.[chatController1.currentRoomId] }}
```

### Rooms Bindings

`Rooms`

```js
{{ loadRooms.data || [] }}
```

`Current Room ID`

```js
{{ chatController1.currentRoomId }}
```

`Pending Invites`

```js
{{ loadInvites.data || [] }}
```

`Show Rooms Panel`

```js
true
```

## Room Types

The component supports these room types:

- `public`
- `private`
- `llm`

### Public Rooms

Use `public` for standard shared chat spaces.

Typical examples:

- General
- Announcements
- Team coordination channels

### Private Rooms

Use `private` when access depends on membership.

Typical examples:

- project sub-teams
- manager-only rooms
- rooms where invite flows matter

These rooms usually work together with:

- `pendingInvites`
- `inviteSend`
- `inviteAccept`
- `inviteDecline`

### LLM Rooms

Use `llm` when the room is associated with an AI workflow.

The room can store an `llmQueryName` field so your app knows which query or backend flow should respond in that room.

The Chat Box only records whether the user **@-mentioned the AI** on the last send (`chatBox1.lastSentMessageTagsLlm`). Your app should **run the mapped LLM query only when that flag is true**, so normal messages in an LLM room stay human-to-human until someone tags the assistant.

Typical examples:

- GPT assistant
- support bot room
- internal knowledge assistant room

The UI can then show AI thinking state through:

```js
{{ !!chatController1.aiThinkingRooms?.[chatController1.currentRoomId] }}
```

## Expected Data Shape

### Messages

Each message should look like:

```json
{
  "id": "msg_123",
  "text": "Hello",
  "authorId": "user_1",
  "authorName": "Alice",
  "timestamp": 1710000000000,
  "authorType": "user"
}
```

For assistant responses, `authorType` can be:

```json
{
  "authorType": "assistant"
}
```

### Rooms

Each room should look like:

```json
{
  "id": "room_123",
  "name": "General",
  "type": "public",
  "description": "Team chat",
  "members": ["user_1", "user_2"],
  "createdBy": "user_1",
  "createdAt": 1710000000000,
  "llmQueryName": null
}
```

### Pending Invites

Each invite should look like:

```json
{
  "id": "invite_123",
  "roomId": "room_123",
  "roomName": "Design Team",
  "fromUserId": "user_1",
  "fromUserName": "Alice",
  "toUserId": "user_2",
  "timestamp": 1710000000000
}
```

## Exposed Variables

`chatBox1` exposes state created by user interaction. These values are the bridge between the UI and your query/controller logic.

### Message State

- `{{ chatBox1.lastSentMessageText }}`
- `{{ chatBox1.lastSentMessageTagsLlm }}`
- `{{ chatBox1.messageText }}`

Use `lastSentMessageText` when saving a message after `messageSent`.

Use `lastSentMessageTagsLlm` when deciding whether to run the room’s LLM query: it is `true` only if the user inserted an **@-mention of the AI** (serialized as `@[…](u:__llm_bot__)` inside `lastSentMessageText`).

Use `messageText` when you want the current draft value.

### Room Action State

- `{{ chatBox1.pendingRoomId }}`
- `{{ chatBox1.newRoomName }}`
- `{{ chatBox1.newRoomType }}`
- `{{ chatBox1.newRoomDescription }}`
- `{{ chatBox1.newRoomLlmQuery }}`

These are populated when the user interacts with the rooms UI.

### Invite State

- `{{ chatBox1.inviteTargetUserId }}`
- `{{ chatBox1.pendingInviteId }}`

These are populated when the user sends or handles invites.

## Events

The component emits:

- `messageSent`
- `startTyping`
- `stopTyping`
- `roomSwitch`
- `roomLeave`
- `roomCreate`
- `inviteSend`
- `inviteAccept`
- `inviteDecline`

These events are the main integration points for your queries and Chat Controller methods.

## Typical Message Flow

The normal message flow is:

1. the user types in the chat input
2. `chatBox1` emits `startTyping`
3. the user sends the message
4. `chatBox1.lastSentMessageText` and `chatBox1.lastSentMessageTagsLlm` become available
5. `chatBox1` emits `messageSent`
6. your `saveMessage` query stores the message
7. your app tells connected users to refresh
8. `loadMessages` runs again

### Example Save Payload

Typical message payload:

```json
{
  "id": "{{ Date.now() }}_{{ Math.random().toString(36).slice(2, 8) }}",
  "roomId": "{{ chatController1.currentRoomId }}",
  "text": "{{ chatBox1.lastSentMessageText }}",
  "authorId": "{{ chatController1.userId }}",
  "authorName": "{{ chatController1.userName }}",
  "timestamp": {{ Date.now() }},
  "authorType": "user"
}
```

### Recommended `messageSent` Wiring

```js
saveMessage
  .run()
  .then(() => {
    chatController1.setRoomData(
      chatController1.currentRoomId,
      "messagePing",
      {
        roomId: chatController1.currentRoomId,
        ts: Date.now(),
        authorId: chatController1.userId
      }
    );
    return loadMessages.run();
  })
  .then(() => chatController1.stopTyping())
```

This pattern works well because:

- the real message is persisted by your query
- the lightweight room signal tells other users to reload

## Typing Indicator Flow

`Chat Box` already emits:

- `startTyping`
- `stopTyping`

The simplest wiring is:

### `startTyping`

```js
chatController1.startTyping(chatController1.currentRoomId)
```

### `stopTyping`

```js
chatController1.stopTyping()
```

Other users then see the indicator through:

```js
{{ chatController1.typingUsers }}
```

## Room Switching Flow

When a user clicks a room, the room id is exposed through:

```js
{{ chatBox1.pendingRoomId }}
```

Recommended wiring:

```js
chatController1.stopTyping()
chatController1.switchRoom(chatBox1.pendingRoomId)
```

Then on `chatController1 -> roomSwitched`, reload messages:

```js
loadMessages.run()
```

This keeps the active room state centralized in `chatController1.currentRoomId`.

## Room Creation Flow

When the user creates a room, `chatBox1` exposes:

- `chatBox1.newRoomName`
- `chatBox1.newRoomType`
- `chatBox1.newRoomDescription`
- `chatBox1.newRoomLlmQuery`

Typical create-room payload:

```json
{
  "id": "{{ Date.now() }}_{{ Math.random().toString(36).slice(2, 8) }}",
  "name": "{{ chatBox1.newRoomName }}",
  "type": "{{ chatBox1.newRoomType }}",
  "description": "{{ chatBox1.newRoomDescription }}",
  "members": ["{{ chatController1.userId }}"],
  "createdBy": "{{ chatController1.userId }}",
  "createdAt": {{ Date.now() }},
  "llmQueryName": "{{ chatBox1.newRoomLlmQuery }}"
}
```

Recommended event handling:

```js
createRoom.run().then(() => loadRooms.run())
```

## Leave Room Flow

When a user leaves a room, the target room is exposed through:

```js
{{ chatBox1.pendingRoomId }}
```

Typical handling:

1. update that room's membership in your data store
2. reload rooms
3. clear or switch the current room if needed

## Invite Flow

For private rooms, `chatBox1` can support invites.

### Invite Send

Use:

```js
{{ chatBox1.inviteTargetUserId }}
```

to create an invite record or trigger your backend flow.

### Invite Accept / Decline

Use:

```js
{{ chatBox1.pendingInviteId }}
```

to resolve the invite record, update room membership, and reload invites.

## LLM Room Flow

For `llm` rooms, the room record can carry:

```js
llmQueryName
```

This gives your app a room-level mapping to the AI query or workflow that should run there.

A common pattern is:

1. user sends a message in an LLM room
2. your app detects the room type or `llmQueryName`, and **`chatBox1.lastSentMessageTagsLlm === true`** (user @-mentioned the AI)
3. you trigger the AI query
4. set thinking state:

```js
chatController1.setAiThinking(chatController1.currentRoomId, true)
```

5. save the assistant message after the AI response
6. clear thinking state:

```js
chatController1.setAiThinking(chatController1.currentRoomId, false)
```

## Running The LLM Query

For `llm` rooms, the important detail is that `chatBox1` stores the room metadata, but it does not automatically execute the query named in `llmQueryName`.

That execution flow is still something you wire yourself in the app.

The usual pattern is:

1. save the user's message first
2. resolve the current room
3. check whether it is an `llm` room
4. if it is, run the mapped AI query
5. save the assistant response as a normal chat message
6. notify connected users to reload

### 1. Store The Query Name On The Room

When creating an LLM room, save:

```js
{{ chatBox1.newRoomLlmQuery }}
```

into the room's `llmQueryName` field.

This should be the exact Lowcoder query name you want the room to use.

Examples:

- `askSupportBot`
- `runKnowledgeAssistant`
- `generateAiReply`

### 2. Resolve The Current Room

After the user sends a message, resolve the active room from your room data:

```js
{{ (loadRooms.data || []).find(r => r.id === chatController1.currentRoomId) }}
```

Then inspect:

- `currentRoom.type`
- `currentRoom.llmQueryName`

### 3. Decide Whether AI Should Run

Typical condition:

```js
currentRoom?.type === "llm" &&
  currentRoom?.llmQueryName &&
  chatBox1.lastSentMessageTagsLlm === true
```

If that condition is false, stop after the normal save/reload flow (the message is still saved like any other chat message).

If it is true, continue into the AI flow.

### 4. Choose How To Run The Query

There are two common approaches.

#### Fixed AI Query

If all AI rooms use the same logic, you can keep one explicit AI query such as:

- `runLlmReply`

In that case:

1. save the user message
2. run `runLlmReply`
3. save the assistant response

This is the simplest option.

#### Mapped AI Queries Per Room

If different LLM rooms should trigger different AI workflows, use `llmQueryName` as the room-level mapping.

In that case:

1. save the user message
2. read `currentRoom.llmQueryName`
3. route to the matching query
4. save the assistant response

Because event handlers usually call explicit queries, the cleanest implementation is often a small dispatcher flow that decides which AI query to run based on `llmQueryName`.

### 5. What The AI Query Should Receive

Useful inputs usually include:

- the active room id
- the current room record
- the latest user message
- optional conversation history for that room

Typical values:

```js
{{ chatController1.currentRoomId }}
{{ chatBox1.lastSentMessageText }}
{{ chatBox1.lastSentMessageTagsLlm }}
{{ (loadRooms.data || []).find(r => r.id === chatController1.currentRoomId) }}
{{ loadMessages.data || [] }}
```

### 6. Save The Assistant Reply

When the AI query returns, save the assistant response as a normal chat message.

Typical assistant payload:

```json
{
  "id": "{{ Date.now() }}_{{ Math.random().toString(36).slice(2, 8) }}",
  "roomId": "{{ chatController1.currentRoomId }}",
  "text": "{{ llmQuery.data.message?.content || llmQuery.data.content || llmQuery.data.text }}",
  "authorId": "__llm_bot__",
  "authorName": "AI",
  "timestamp": {{ Date.now() }},
  "authorType": "assistant"
}
```

The message will render as an assistant message when:

- `authorType === "assistant"`

or when:

- `authorId === "__llm_bot__"`

### 7. Notify Connected Users Again

After saving the assistant reply, notify the room again:

```js
chatController1.setRoomData(
  chatController1.currentRoomId,
  "messagePing",
  {
    roomId: chatController1.currentRoomId,
    ts: Date.now(),
    authorId: "__llm_bot__"
  }
)
```

Then clear AI thinking:

```js
chatController1.setAiThinking(chatController1.currentRoomId, false)
```

### Recommended Full LLM Room Sequence

The full flow usually looks like this:

1. user sends a message in `chatBox1`
2. save the user message
3. notify the room to reload
4. resolve the current room
5. if the room is an `llm` room **and** `chatBox1.lastSentMessageTagsLlm` is true:
6. set AI thinking to `true`
7. run the AI query mapped by `llmQueryName`
8. save the assistant response
9. notify the room again
10. set AI thinking to `false`
11. reload messages

If the room is `llm` but the user did not @-mention the AI, skip steps 6–10 and only keep the normal chat persistence/reload path.

### Practical Note

If you only need one AI behavior, a single fixed LLM query is easier to maintain.

If you need several AI room behaviors, `llmQueryName` is the right place to store the mapping, but it is usually best combined with a dispatcher layer rather than trying to dynamically call arbitrary queries directly from the event handler.

## Working With Chat Controller

`Chat Box` is the UI. `Chat Controller` is the realtime collaboration layer.

That means:

- `chatController1.currentRoomId` is the active room source of truth
- `chatController1.typingUsers` drives typing state
- `chatController1.onlineUsers` drives online presence
- `chatController1.sharedState` is app-wide shared data
- `chatController1.roomData` is room-scoped shared data

For a full controller reference, see [Chat Controller](chat-controller.md).

## Building A Custom Chat With Standard Components

If you want a completely custom UI, you can still use the same room and realtime model.

Typical setup:

1. use a `List View` to render rooms
2. use `currentItem.id` inside the room row to select a room
3. call:

```js
chatController1.switchRoom(currentItem.id)
```

4. load messages filtered by:

```js
{{ chatController1.currentRoomId }}
```

5. show typing users and online users from `chatController1`
6. use `chatController1.setRoomData(...)` for lightweight room notifications

This gives you the same realtime collaboration layer even if you do not use the built-in Chat Box layout.

## Summary

- **Chat Box** is the room-based chat UI component
- it supports `public`, `private`, and `llm` rooms
- it exposes the key user interactions as variables and events
- it works best together with **Chat Controller**
- your own queries remain responsible for loading and saving rooms, messages, and invites
