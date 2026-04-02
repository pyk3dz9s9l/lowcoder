# Chat Controller

The component **Chat Controller** provides the realtime state layer for chat experiences.

It is designed to work with:

- **Chat Box**
- a custom room-based chat UI built from standard components such as `List View`, `Container`, `Input`, and `Button`

## What Chat Controller Does

`Chat Controller` manages the realtime collaboration layer of a chat application.

That includes:

- connection state
- current user presence
- active room state
- typing indicators
- online users
- room-scoped shared data
- app-wide shared data
- AI thinking indicators

It does **not** replace your message or room queries.

Instead, it works alongside them:

- your queries persist and load the real room/message data
- `Chat Controller` synchronizes the live collaborative state across connected clients

## Core Idea

All users connected with the same `applicationId` share the same realtime collaboration channel.

Inside that channel, the controller keeps synchronized:

- who is online
- who is typing
- which room each user is currently viewing
- app-level shared data
- room-level shared data
- AI thinking state

This makes it a good fit for:

- live room switching
- presence indicators
- typing indicators
- lightweight notifications like “room changed, reload messages”

## How It Works Under The Hood

Internally, the controller uses **Hocuspocus** and **Yjs** for synchronization.

In practice, that means:

- presence is shared through realtime awareness
- app-wide shared objects are synchronized through a shared map
- room-scoped shared objects are synchronized through another shared map

The server-side transport for that synchronization is implemented in [hocuspocus-server.js](/Users/faran/Documents/lowcoder-main/lowcoder/client/packages/lowcoder/hocuspocus-server.js).

You do not need to understand the server implementation to use the component, but it is helpful to know that this is the realtime layer behind the scenes.

## Main Properties

Configure:

- `applicationId`
- `userId`
- `userName`

### `applicationId`

This scopes the shared collaboration space.

Users with the same `applicationId` participate in the same realtime channel.

### `userId`

This identifies the current user.

### `userName`

This is the display name used in presence and typing indicators.

## Exposed State

The controller exposes the following state values.

### Connection State

- `{{ chatController1.ready }}`
- `{{ chatController1.error }}`
- `{{ chatController1.connectionStatus }}`

Use these when you want to:

- show whether the realtime layer is online
- display connection status
- surface authentication or transport errors

### Presence State

- `{{ chatController1.onlineUsers }}`
- `{{ chatController1.typingUsers }}`
- `{{ chatController1.currentRoomId }}`

### AI State

- `{{ chatController1.aiThinkingRooms }}`

### Shared Data State

- `{{ chatController1.sharedState }}`
- `{{ chatController1.roomData }}`

## State Shapes

### `onlineUsers`

`onlineUsers` is an array of currently connected peers.

Shape:

```js
[
  {
    userId: "user_1",
    userName: "Alice",
    currentRoomId: "room_123"
  }
]
```

This is useful for:

- online user sidebars
- room presence counts
- showing whether another user is active in the same room

### `typingUsers`

`typingUsers` is scoped to the current room and excludes the current user.

Shape:

```js
[
  {
    userId: "user_2",
    userName: "Bob",
    roomId: "room_123"
  }
]
```

This is useful for:

- “Bob is typing...”
- “2 people are typing...”

### `currentRoomId`

This is the active room for the current user.

It is typically the room id used by:

- `loadMessages`
- room highlighting
- typing presence
- AI thinking indicators

### `aiThinkingRooms`

This is a map of room ids to thinking state.

Example:

```js
{
  room_123: true,
  room_456: false
}
```

This is useful when you have `llm` rooms or an AI assistant integrated into a room-based chat flow.

### `sharedState`

`sharedState` is app-level shared data.

Example:

```js
{
  activeAnnouncement: "Maintenance at 7 PM",
  featureFlagAiRooms: true
}
```

This is for values that belong to the application as a whole rather than to a single room.

### `roomData`

`roomData` is room-scoped shared data.

Its shape is:

```js
{
  room_123: {
    messagePing: { ts: 1710000000000, authorId: "user_1" },
    lastMessage: { text: "Hello", authorId: "user_1" }
  }
}
```

This is for values that should be scoped to a specific room only.

## Shared State vs Room Data

This is the most important conceptual distinction in the controller.

### Use `sharedState` For App-Level Collaboration

Typical examples:

- app-wide announcement banners
- feature flags
- collaborative state not tied to a room
- global session metadata

Write with:

```js
chatController1.setSharedState(key, value)
```

### Use `roomData` For Room-Level Collaboration

Typical examples:

- `messagePing` telling room clients to reload messages
- room-specific last message preview
- room-scoped draft metadata
- room-specific AI assistant state

Write with:

```js
chatController1.setRoomData(roomId, key, value)
```

## Events

The controller emits:

- `userJoined`
- `userLeft`
- `roomSwitched`
- `connected`
- `disconnected`
- `error`
- `aiThinkingStarted`
- `aiThinkingStopped`
- `sharedStateChanged`
- `roomDataChanged`

These events are the main hooks for reacting to realtime updates.

## Methods

The controller exposes the following methods.

### Presence Methods

`startTyping(roomId?)`

Marks the current user as typing in the given room or the current room.

`stopTyping()`

Clears the typing flag for the current user.

`switchRoom(roomId)`

Updates the active room and moves the current user's presence to that room.

### AI Methods

`setAiThinking(roomId, isThinking)`

Marks whether an AI is currently thinking in the given room.

### App-Level Shared State Methods

`setSharedState(key, value)`

Sets an app-wide shared value.

`deleteSharedState(key)`

Removes an app-wide shared value.

### Room-Level Shared State Methods

`setRoomData(roomId, key, value)`

Sets a room-scoped shared value.

`deleteRoomData(roomId, key?)`

Removes a single room-scoped key or clears the entire room entry.

### User Method

`setUser(userId, userName)`

Updates the identity used by the controller.

## Typical Patterns

### Typing Indicator Pattern

On input change:

```js
chatController1.startTyping(chatController1.currentRoomId)
```

On blur, send, room switch, or inactivity:

```js
chatController1.stopTyping()
```

### Room Switch Pattern

When a user selects a room:

```js
chatController1.switchRoom(roomId)
```

Then on `roomSwitched`, reload the messages for:

```js
{{ chatController1.currentRoomId }}
```

### Message Reload Pattern

After saving a message, notify the room:

```js
chatController1.setRoomData(
  chatController1.currentRoomId,
  "messagePing",
  {
    roomId: chatController1.currentRoomId,
    ts: Date.now(),
    authorId: chatController1.userId
  }
)
```

Then on `roomDataChanged`, reload messages.

### Room Presence Pattern

To show users currently in the active room:

```js
{{
  (chatController1.onlineUsers || []).filter(
    u => u.currentRoomId === chatController1.currentRoomId
  )
}}
```

### LLM Room Pattern

If you support `llm` rooms, use:

```js
chatController1.setAiThinking(roomId, true)
```

when the AI starts generating, and:

```js
chatController1.setAiThinking(roomId, false)
```

when the AI finishes.

This makes the thinking state visible to everyone in that room.

### LLM Query Execution Pattern

`Chat Controller` does not execute the room's LLM query by itself.

Instead, it supports the realtime pieces around that AI execution:

1. a user sends a message
2. the app saves the user message
3. the app checks whether the current room is an `llm` room
4. the app runs the AI query mapped to that room
5. the app saves the assistant response
6. the controller shares thinking and refresh state with everyone else in the room

In other words:

- your query layer executes the AI logic
- `Chat Controller` keeps the room state synchronized while that happens

Typical sequence:

set AI thinking:

```js
chatController1.setAiThinking(chatController1.currentRoomId, true)
```

run the AI query

save the assistant message

notify the room:

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

clear AI thinking:

```js
chatController1.setAiThinking(chatController1.currentRoomId, false)
```

This lets every connected user in that room see:

- that the AI is currently working
- that a new assistant reply has arrived

## Using Chat Controller With Chat Box

Recommended pairing:

- `chatBox1.currentRoomId` -> `{{ chatController1.currentRoomId }}`
- `chatBox1.typingUsers` -> `{{ chatController1.typingUsers }}`
- `chatBox1.onlineUsers` -> `{{ chatController1.onlineUsers }}`
- `chatBox1.isAiThinking` -> `{{ !!chatController1.aiThinkingRooms?.[chatController1.currentRoomId] }}`

Typical event handling:

- `chatBox1 -> roomSwitch` -> `chatController1.switchRoom(chatBox1.pendingRoomId)`
- `chatBox1 -> startTyping` -> `chatController1.startTyping(chatController1.currentRoomId)`
- `chatBox1 -> stopTyping` -> `chatController1.stopTyping()`

For the UI-side details, see [Chat Box](chat-box.md).

## Using Chat Controller With A Custom Chat UI

When building your own room-based chat interface, the controller becomes the realtime backbone.

Typical flow:

1. use a `List View` to display rooms
2. select a room with:

```js
chatController1.switchRoom(currentItem.id)
```

3. load messages filtered by:

```js
{{ chatController1.currentRoomId }}
```

4. show typing users from `chatController1.typingUsers`
5. show online users from `chatController1.onlineUsers`
6. use `roomData` to signal room refreshes or store room-scoped metadata

## When To Use Shared Objects

Use the controller's shared objects when you need realtime collaboration data that should not itself be the canonical persisted chat record.

Good use cases:

- ephemeral collaboration metadata
- room refresh signals
- live status indicators
- app-wide flags visible to all connected users

Less suitable use cases:

- full persistent message history
- canonical room records
- long-term audit storage

Those are usually better handled by your own queries and datastore.

## Summary

- **Chat Controller** is the realtime collaboration component for chat features
- it scopes collaboration by `applicationId`
- it exposes presence, room state, app-wide shared state, and room-scoped shared state
- use `sharedState` for app-level data
- use `roomData` for room-level data
- pair it with **Chat Box** or with your own custom chat UI
