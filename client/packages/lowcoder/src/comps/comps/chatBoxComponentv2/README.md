# Chat V2 — Testing & Setup Guide

## Architecture

The Chat V2 system separates **real-time signaling** from **data storage**:

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| Signal | **Chat Signal Controller** | Pluv/Yjs — presence, typing, message notifications |
| UI | **Chat Box V2** | Pure display — renders messages, fires events |
| Storage | **Your Data Queries** | MongoDB, PostgreSQL, REST API, etc. |

Pluv/Yjs only broadcasts ephemeral real-time data (who is online, who is typing, "a new message was just saved"). It does **not** store messages — that is your database's job.

---

## Prerequisites

### 1. Pluv.io Account

Sign up at [pluv.io](https://pluv.io) and create a project. You will need:

- **Publishable Key** (`pk_...`) — used by the client
- **Secret Key** (`sk_...`) — used by the auth server only

### 2. Start the Pluv Auth Server

```bash
cd client/packages/lowcoder

# Set environment variables
export PLUV_PUBLISHABLE_KEY="pk_..."
export PLUV_SECRET_KEY="sk_..."

# Start the server (defaults to port 3006)
npm run start:pluv
# or directly:
node pluv-server.js
```

Verify it's running:

```bash
curl http://localhost:3006/health
# → { "status": "healthy", "server": "pluv-chat", ... }
```

---

## Quick Start — Minimal Chat in 5 Steps

### Step 1: Add the Chat Signal Controller

1. In the Lowcoder editor, open the **Insert** panel
2. Search for **"Chat Signal Controller"** (under Collaboration)
3. Drag it onto the canvas (it's headless — no visual output)
4. Configure in the property panel:

| Property | Value |
|----------|-------|
| Application ID | `my_chat_app` (or any string — scopes the signal room) |
| User ID | `{{ currentUser.id }}` or a hardcoded test value like `user_1` |
| User Name | `{{ currentUser.name }}` or `Alice` |
| Public Key | Your Pluv publishable key (`pk_...`) |
| Auth URL | `http://localhost:3006/api/auth/pluv` |

The controller is named `chatControllerV2` by default — you can rename it.

### Step 2: Add the Chat Box V2

1. Search for **"Chat Box V2"** and drag it onto the canvas
2. Configure in the property panel:

| Property | Value | Purpose |
|----------|-------|---------|
| Chat Title | `Team Chat` | Header display name |
| Messages | `{{ loadMessages.data }}` | Bind to your data query (Step 3) |
| Current User ID | `{{ chatControllerV2.userId }}` | Distinguishes own vs. others' messages |
| Current User Name | `{{ chatControllerV2.userName }}` | Display name |
| Typing Users | `{{ chatControllerV2.typingUsers }}` | Shows typing indicators |

### Step 3: Create Data Queries

You need two queries — one to **load** messages and one to **save** them. Use whatever data source you prefer.

#### Example: MongoDB "loadMessages" query

```js
// Query name: loadMessages
// Data source: MongoDB
// Collection: chat_messages
// Operation: Find
// Filter:
{ "roomId": "general" }
// Sort:
{ "timestamp": 1 }
```

#### Example: MongoDB "saveMessage" query

```js
// Query name: saveMessage
// Data source: MongoDB
// Collection: chat_messages
// Operation: Insert
// Document:
{
  "id": {{ uuid() }},
  "roomId": "general",
  "text": {{ chatBoxV2.lastSentMessageText }},
  "authorId": {{ chatControllerV2.userId }},
  "authorName": {{ chatControllerV2.userName }},
  "timestamp": {{ Date.now() }}
}
```

#### Example: REST API queries

```
// loadMessages
GET https://your-api.com/messages?roomId=general

// saveMessage
POST https://your-api.com/messages
Body: {
  "roomId": "general",
  "text": {{ chatBoxV2.lastSentMessageText }},
  "authorId": {{ chatControllerV2.userId }},
  "authorName": {{ chatControllerV2.userName }},
  "timestamp": {{ Date.now() }}
}
```

### Step 4: Wire Up Events

#### On the Chat Box V2:

| Event | Action |
|-------|--------|
| **Message Sent** | 1. Run `saveMessage` query<br>2. Run `chatControllerV2.broadcastNewMessage("general")`<br>3. Run `loadMessages` query |
| **Start Typing** | Run `chatControllerV2.startTyping("general")` |
| **Stop Typing** | Run `chatControllerV2.stopTyping()` |

#### On the Chat Signal Controller:

| Event | Action |
|-------|--------|
| **New Message Broadcast** | Run `loadMessages` query (a peer saved a new message) |
| **Connected** | Run `loadMessages` query (initial load) |

### Step 5: Test

1. Open the app in **two browser tabs** (or two different browsers)
2. Set different User IDs for each tab (e.g. `user_1` / `user_2`)
3. Type in one tab — the other should show a typing indicator
4. Send a message — the other tab should see it appear after the broadcast triggers a reload

---

## Message Data Format

The Chat Box V2 accepts messages as a JSON array. It reads fields flexibly:

| Priority 1 | Priority 2 | Priority 3 | Priority 4 | Purpose |
|------------|------------|------------|------------|---------|
| `id` | `_id` | — | — | Unique key for rendering |
| `text` | `message` | `content` | — | Message body |
| `authorId` | `userId` | `author_id` | `sender` | Author identification |
| `authorName` | `userName` | `author_name` | `senderName` | Display name |
| `timestamp` | `createdAt` | `created_at` | `time` | Time display |

The `authorType` field (or `role`) with value `"assistant"` renders AI-style bubbles with markdown support and a copy button.

So if your database uses `sender` instead of `authorId`, it will still work.

---

## Rooms / Channels

Rooms are **not managed by the components** — they live in your database. The controller and chatbox are room-agnostic; you decide how to filter and organize messages.

### Single Room (Simplest)

Hardcode a room ID in your queries:

```js
// loadMessages filter
{ "roomId": "general" }
```

### Multiple Rooms

Build a room selector using standard Lowcoder components (Select, List, etc.):

1. Create a query to load rooms from your DB
2. Add a **Select** component bound to `{{ loadRooms.data }}`
3. Filter messages by selected room:

```js
// loadMessages filter
{ "roomId": {{ roomSelect.value }} }
```

4. When switching rooms, call:

```js
chatControllerV2.switchRoom(roomSelect.value)
```

This scopes the typing indicator to the selected room, so users in different rooms don't see each other's typing state.

5. When sending, broadcast with the room ID:

```js
chatControllerV2.broadcastNewMessage(roomSelect.value)
```

### Public vs. Private Rooms

Since rooms are in your database, you control access:

```js
// Public rooms query
{ "type": "public" }

// Private rooms — only show rooms where the user is a member
{ "type": "private", "members": { "$in": [{{ currentUser.id }}] } }
```

There is no built-in room creation UI. Use a **Modal** or **Form** component with your own "createRoom" query.

---

## Typing Indicators

Typing indicators work automatically when you wire the events:

1. **Chat Box V2** fires `startTyping` when the user begins typing and `stopTyping` after 2 seconds of inactivity
2. Wire these events to the controller methods:
   - `startTyping` → `chatControllerV2.startTyping("roomId")`
   - `stopTyping` → `chatControllerV2.stopTyping()`
3. Bind the Chat Box V2's **Typing Users** property to `{{ chatControllerV2.typingUsers }}`

The typing indicator shows the names of users currently typing, scoped to the controller's `currentRoomId`. If you use `switchRoom()` when changing rooms, typing indicators are automatically scoped.

---

## Online Users

The controller exposes `{{ chatControllerV2.onlineUsers }}` — an array of:

```json
[
  { "userId": "user_1", "userName": "Alice", "currentRoomId": "general" },
  { "userId": "user_2", "userName": "Bob", "currentRoomId": "design" }
]
```

Display this with any Lowcoder component (List, Table, Avatars, etc.):

```
{{ chatControllerV2.onlineUsers.length }} users online
```

---

## Controller Exposed Properties Reference

Access these via `{{ chatControllerV2.propertyName }}`:

| Property | Type | Description |
|----------|------|-------------|
| `ready` | `boolean` | Whether the signal server is connected |
| `connectionStatus` | `string` | `"Online"`, `"Connecting..."`, or `"Offline"` |
| `error` | `string \| null` | Error message if connection failed |
| `onlineUsers` | `Array<{ userId, userName, currentRoomId }>` | Currently connected users |
| `typingUsers` | `Array<{ userId, userName, roomId }>` | Users currently typing |
| `currentRoomId` | `string \| null` | Active room set via `switchRoom()` |
| `lastMessageNotification` | `Object \| null` | Last broadcast: `{ roomId, messageId, authorId, authorName, timestamp }` |
| `userId` | `string` | Current user ID |
| `userName` | `string` | Current user name |
| `applicationId` | `string` | Application scope ID |

## Controller Methods Reference

Call these via `chatControllerV2.methodName(args)` in event handlers:

| Method | Params | Description |
|--------|--------|-------------|
| `broadcastNewMessage(roomId, messageId?)` | `roomId`: string, `messageId`: string (optional) | Notify all peers a message was saved — triggers their `onNewMessageBroadcast` event |
| `startTyping(roomId?)` | `roomId`: string (optional) | Set typing indicator for current user |
| `stopTyping()` | — | Clear typing indicator |
| `switchRoom(roomId)` | `roomId`: string | Set current room context for presence scoping |
| `setUser(userId, userName)` | `userId`: string, `userName`: string | Update identity at runtime |

## Chat Box V2 Exposed Properties Reference

Access these via `{{ chatBoxV2.propertyName }}`:

| Property | Type | Description |
|----------|------|-------------|
| `lastSentMessageText` | `string` | Text of the last message the user sent — use in your save query |
| `messageText` | `string` | Current text in the input (live draft) |
| `chatTitle` | `string` | The configured chat title |

## Chat Box V2 Events Reference

| Event | When | Typical action |
|-------|------|----------------|
| `messageSent` | User presses Enter or Send | Run save query, broadcast, reload messages |
| `startTyping` | User begins typing | `chatControllerV2.startTyping(roomId)` |
| `stopTyping` | User idle for 2s | `chatControllerV2.stopTyping()` |

---

## Testing Checklist

### Basic messaging
- [ ] Start pluv-server (`node pluv-server.js`)
- [ ] Add Chat Signal Controller with valid Pluv keys and Auth URL
- [ ] Add Chat Box V2 with messages bound to a data query
- [ ] Verify `chatControllerV2.ready` shows `true`
- [ ] Verify `chatControllerV2.connectionStatus` shows `"Online"`
- [ ] Send a message — `lastSentMessageText` updates
- [ ] Message appears in your database
- [ ] Message appears in the chat after reload

### Real-time sync (two browser tabs)
- [ ] Tab A sends a message → Tab B's `onNewMessageBroadcast` fires → messages reload
- [ ] Tab A types → Tab B sees typing indicator
- [ ] Tab A stops typing (2s idle) → indicator disappears
- [ ] Tab B sees Tab A in `onlineUsers`
- [ ] Tab A closes → Tab B's `userLeft` event fires

### Multi-room
- [ ] Switch rooms via `chatControllerV2.switchRoom(roomId)`
- [ ] Messages filter to the selected room
- [ ] Typing indicators scope to the current room
- [ ] Broadcasting targets the correct room

### Error handling
- [ ] Invalid Pluv key → `error` event fires, `error` property set
- [ ] Pluv server down → `connectionStatus` shows `"Offline"`, `disconnected` event fires
- [ ] Server comes back → `connected` event fires, status returns to `"Online"`

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `connectionStatus` stuck on `"Connecting..."` | Verify pluv-server is running and Auth URL is correct |
| Auth fails | Check browser console for `[ChatControllerV2] Auth failed` — verify Pluv keys match |
| Messages don't appear | Check your `loadMessages` query returns the correct format |
| Typing not showing | Verify `typingUsers` is bound to `{{ chatControllerV2.typingUsers }}` and events are wired |
| Broadcasts not received | Ensure both users have the same `applicationId` |
| Own messages show as "other" | Check `currentUserId` matches the `authorId` in your message data |
