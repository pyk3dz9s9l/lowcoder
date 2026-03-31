# ChatBox V2 + ChatController — Complete Guide

## Architecture Overview

The chat system uses two components and a server:

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (each user)                                        │
│                                                             │
│  ┌──────────────────┐       ┌───────────────────────────┐   │
│  │  ChatController   │◄─────►│  Pluv.io (WebSocket/YJS)  │   │
│  │  (hook component) │       │  CRDT auto-sync layer     │   │
│  │                   │       └───────────────────────────┘   │
│  │  Exposes:         │                                       │
│  │  • sharedState    │       ┌───────────────────────────┐   │
│  │  • roomData       │       │  ChatBox                   │   │
│  │  • onlineUsers    │──────►│  (UI component)            │   │
│  │  • typingUsers    │       │  Displays messages, rooms  │   │
│  │  • methods        │       └───────────────────────────┘   │
│  └──────────────────┘                                       │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │  MongoDB Queries   │  ← You create these (save/load)     │
│  │  (data source)     │                                      │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐      ┌──────────────────────┐
│  pluv-server.js       │      │  MongoDB Atlas        │
│  (auth + webhooks)    │      │  (your database)      │
│  Port 3006            │      │                       │
└──────────────────────┘      └──────────────────────┘
```

**ChatController** is a non-visual hook component. It manages:
- Real-time shared state (YJS CRDT via Pluv.io) — auto-syncs JSON across all users
- Presence — who's online, who's typing, what room they're in
- Room-scoped data — invisible JSON data per room/channel

**ChatBox** is the visual chat UI. It receives data via property bindings and fires events on user interactions. It does NOT connect to Pluv directly — it's a pure display component.

**pluv-server.js** handles auth token creation for Pluv.io. All WebSocket traffic goes through Pluv's cloud infrastructure, not this server.

---

## Prerequisites

### 1. Pluv.io Account

Sign up at [pluv.io](https://pluv.io) and create a project. You need:
- `PLUV_PUBLISHABLE_KEY` (public, goes to the client)
- `PLUV_SECRET_KEY` (private, stays on the server)

### 2. MongoDB

A MongoDB database with two collections:
- `rooms` — stores chat room definitions
- `messages` — stores chat messages

You can use MongoDB Atlas (free tier works) or a local instance.

### 3. Environment Variables

**pluv-server.js** (server-side):
```
PLUV_PUBLISHABLE_KEY=pk_...
PLUV_SECRET_KEY=sk_...
PORT=3006                    # optional, defaults to 3006
```

**Lowcoder client** (build-time or runtime):
```
VITE_PLUV_PUBLIC_KEY=pk_...
VITE_PLUV_AUTH_URL=/api/auth/pluv   # optional, defaults to this
```

### 4. Start the Pluv Server

```bash
cd client/packages/lowcoder
node pluv-server.js
```

Verify it's running:
```bash
curl http://localhost:3006/health
```

---

## MongoDB Setup

### Create the Collections

In your MongoDB database, create two collections. No special indexes are required for basic use, but recommended indexes are shown below.

### `rooms` Collection

Each document represents a chat room:

```json
{
  "_id": "room_general",
  "id": "room_general",
  "name": "General",
  "type": "public",
  "description": "Main chat room for everyone",
  "members": ["user_alice", "user_bob"],
  "createdBy": "user_alice",
  "createdAt": 1710600000000,
  "llmQueryName": null
}
```

Insert a seed room so you have something to start with:

```javascript
db.rooms.insertOne({
  id: "room_general",
  name: "General",
  type: "public",
  description: "Main chat room",
  members: [],
  createdBy: "system",
  createdAt: Date.now(),
  llmQueryName: null
})
```

### `messages` Collection

Each document represents a single message:

```json
{
  "_id": "msg_abc123",
  "id": "msg_abc123",
  "roomId": "room_general",
  "text": "Hello everyone!",
  "authorId": "user_alice",
  "authorName": "Alice",
  "timestamp": 1710600005000
}
```

Recommended index for fast message loading:

```javascript
db.messages.createIndex({ roomId: 1, timestamp: 1 })
```

---

## Step-by-Step Setup in Lowcoder

### Step 1: Add a MongoDB Data Source

Go to **Settings → Data Sources → New Data Source → MongoDB**. Configure your connection string.

### Step 2: Create the Queries

You need 4 queries. Create them in the query panel of your app.

#### Query: `loadRooms`

Loads all rooms from MongoDB.

- **Type**: MongoDB
- **Action**: Find
- **Collection**: `rooms`
- **Query**: `{}`

This returns an array like `[{ id, name, type, members, ... }, ...]`.

#### Query: `loadMessages`

Loads messages for the current room.

- **Type**: MongoDB
- **Action**: Find
- **Collection**: `messages`
- **Query**: `{ "roomId": "{{chatController1.currentRoomId}}" }`
- **Sort**: `{ "timestamp": 1 }`

This returns messages sorted oldest-first for the active room.

#### Query: `saveMessage`

Inserts a new message into MongoDB.

- **Type**: MongoDB
- **Action**: Insert One
- **Collection**: `messages`
- **Document**:

```json
{
  "id": "msg_{{Date.now()}}_{{Math.random().toString(36).slice(2,9)}}",
  "roomId": "{{chatController1.currentRoomId}}",
  "text": "{{chatBox1.lastSentMessageText}}",
  "authorId": "{{chatController1.userId}}",
  "authorName": "{{chatController1.userName}}",
  "timestamp": {{Date.now()}}
}
```

#### Query: `createRoom`

Inserts a new room into MongoDB.

- **Type**: MongoDB
- **Action**: Insert One
- **Collection**: `rooms`
- **Document**:

```json
{
  "id": "room_{{Date.now()}}_{{Math.random().toString(36).slice(2,9)}}",
  "name": "{{chatBox1.newRoomName}}",
  "type": "{{chatBox1.newRoomType}}",
  "description": "{{chatBox1.newRoomDescription}}",
  "members": ["{{chatController1.userId}}"],
  "createdBy": "{{chatController1.userId}}",
  "createdAt": {{Date.now()}},
  "llmQueryName": null
}
```

### Step 3: Add the Components

Drag these onto your canvas from the Insert panel:

1. **ChatController** (found under Hooks in the insert panel — it's non-visual)
2. **ChatBox V2** (found under Components)

### Step 4: Configure ChatController

Select the ChatController in the component tree and set these properties:

| Property | Value |
|---|---|
| Application ID | `{{currentUser.applicationId}}` or any fixed string like `"my_chat_app"` |
| User ID | `{{currentUser.id}}` or `{{currentUser.email}}` |
| User Name | `{{currentUser.name}}` |

### Step 5: Configure ChatBox

Select the ChatBox and set these property bindings:

**Basic section:**

| Property | Binding |
|---|---|
| Messages | `{{loadMessages.data}}` |
| Current User ID | `{{chatController1.userId}}` |
| Current User Name | `{{chatController1.userName}}` |

**Rooms Panel section:**

| Property | Binding |
|---|---|
| Rooms | `{{chatController1.sharedState.rooms \|\| []}}` |
| Current Room ID | `{{chatController1.currentRoomId}}` |
| Online Users | `{{chatController1.onlineUsers}}` |

**Real-time section:**

| Property | Binding |
|---|---|
| Typing Users | `{{chatController1.typingUsers}}` |
| AI Is Thinking | `{{chatController1.aiThinkingRooms[chatController1.currentRoomId]}}` |

### Step 6: Wire the Events

This is where the magic happens. Select the ChatBox and add event handlers:

#### ChatBox Events

| Event | Action |
|---|---|
| **Message Sent** | Run query `saveMessage` |
| **Message Sent** (2nd handler) | Run query `saveMessage` → on success chain: `chatController1.setRoomData(chatController1.currentRoomId, "lastMessage", { text: chatBox1.lastSentMessageText, authorId: chatController1.userId, ts: Date.now() })` |
| **Start Typing** | `chatController1.startTyping()` |
| **Stop Typing** | `chatController1.stopTyping()` |
| **Room Switch** | `chatController1.switchRoom(chatBox1.pendingRoomId)` |
| **Room Create** | Run query `createRoom` → on success chain: run `loadRooms` → on success: `chatController1.setSharedState("rooms", loadRooms.data)` |

#### ChatController Events

| Event | Action |
|---|---|
| **Connected** | Run query `loadRooms` → on success: `chatController1.setSharedState("rooms", loadRooms.data)` |
| **Room Switched** | Run query `loadMessages` |
| **Room Data Changed** | Run query `loadMessages` |

---

## Complete Flow: How It All Works

### Flow 1: App Opens — Loading Rooms

```
1. User opens the app
2. ChatController connects to Pluv.io → "Connected" event fires
3. Connected event handler runs loadRooms query
4. loadRooms returns rooms from MongoDB
5. Handler calls: chatController1.setSharedState("rooms", loadRooms.data)
6. Rooms are now in the YJS shared state

   Meanwhile, for other users already connected:
   → YJS auto-syncs the shared state
   → Their chatController1.sharedState.rooms updates instantly
   → ChatBox re-renders with the room list
   → They did NOT run any query — they got the data via YJS
```

### Flow 2: User Switches to a Room

```
1. User clicks "General" room in the sidebar
2. ChatBox fires "Room Switch" event with pendingRoomId = "room_general"
3. Event handler calls: chatController1.switchRoom("room_general")
4. ChatController updates currentRoomId and presence
5. "Room Switched" event fires
6. Event handler runs loadMessages query (filtered by currentRoomId)
7. loadMessages returns messages from MongoDB
8. ChatBox displays them (bound to {{ loadMessages.data }})
```

### Flow 3: User Sends a Message — Other Users See It

This is the key flow. Here's what happens step by step:

```
USER A (sender):

1. Alice types "Hello!" and presses Send
2. ChatBox fires "Message Sent" event
3. Event handler runs saveMessage query
   → Inserts { id, roomId, text: "Hello!", authorId: "alice", ... } into MongoDB
4. On saveMessage success, handler calls:
   chatController1.setRoomData("room_general", "lastMessage", {
     text: "Hello!",
     authorId: "alice",
     ts: 1710600005000
   })
5. This writes a tiny JSON object to the YJS shared doc under roomData

USER B (receiver):

6. YJS auto-syncs the roomData change to Bob's browser
7. chatController1.roomData updates → "Room Data Changed" event fires
8. Event handler runs loadMessages query
9. loadMessages fetches the latest messages from MongoDB (including Alice's new message)
10. ChatBox re-renders with the new message visible

Total time: ~100-300ms (YJS sync) + ~200-500ms (MongoDB query)
```

**What's happening under the hood:**
- Alice does NOT call any "broadcast" method. She just writes a tiny JSON to `roomData`.
- YJS (CRDT) syncs that JSON to all connected users automatically.
- Bob's browser reacts to the roomData change by reloading messages from MongoDB.
- The actual message lives in MongoDB (persistent, queryable). YJS only carries the "something changed" signal as a side effect of the data write.

### Flow 4: Creating a Room — Other Users See It

```
USER A:

1. Alice clicks "Create Room" → fills in name "Design Team" → submits
2. ChatBox fires "Room Create" event
3. Event handler runs createRoom query (inserts into MongoDB)
4. On success, runs loadRooms query (fetches all rooms)
5. On success, calls: chatController1.setSharedState("rooms", loadRooms.data)

USER B:

6. YJS auto-syncs sharedState.rooms to Bob's browser
7. chatController1.sharedState.rooms updates
8. ChatBox re-renders — "Design Team" room appears in the sidebar
9. Bob did NOT run any query — the room list came through YJS
```

### Flow 5: Typing Indicators

```
1. Alice starts typing in the message input
2. ChatBox fires "Start Typing" event
3. Event handler calls chatController1.startTyping()
4. Pluv presence updates: { userId: "alice", typing: true, currentRoomId: "room_general" }
5. Bob's chatController1.typingUsers updates: [{ userId: "alice", userName: "Alice" }]
6. ChatBox shows "Alice is typing..." indicator

7. Alice stops typing (pauses or clears input)
8. ChatBox fires "Stop Typing" event
9. Event handler calls chatController1.stopTyping()
10. Bob's typingUsers becomes [] → indicator disappears
```

### Flow 6: Sending Invisible JSON Data in a Room

This is NOT a chat message — it's arbitrary JSON that all room members can read. Use cases: live dashboards, game state, form data, IoT readings, etc.

```
USER A (e.g. a dashboard admin):

1. A query returns KPI data. On success:
   chatController1.setRoomData("room_sales", "kpi", {
     revenue: 142000,
     deals: 17,
     updated: "2026-03-16T10:30:00Z"
   })

USER B (e.g. a sales rep viewing the room):

2. YJS auto-syncs roomData
3. Any component bound to {{ chatController1.roomData.room_sales.kpi.revenue }}
   instantly shows: 142000
4. When User A updates the KPI, User B's UI updates in real-time

No messages. No events to wire. Just reactive data binding.
```

---

## API Reference

### ChatController — Properties (read via bindings)

| Property | Type | Description |
|---|---|---|
| `ready` | `boolean` | `true` when connected to Pluv |
| `connectionStatus` | `string` | `"Online"`, `"Connecting..."`, or `"Offline"` |
| `error` | `string \| null` | Error message if connection failed |
| `userId` | `string` | Current user ID |
| `userName` | `string` | Current user name |
| `applicationId` | `string` | Application scope ID |
| `currentRoomId` | `string \| null` | Currently active room |
| `onlineUsers` | `Array<{ userId, userName, currentRoomId }>` | Who's online |
| `typingUsers` | `Array<{ userId, userName, roomId }>` | Who's typing |
| `aiThinkingRooms` | `{ [roomId]: boolean }` | Which rooms have AI thinking |
| `sharedState` | `object` | App-level shared JSON — auto-syncs across all users |
| `roomData` | `{ [roomId]: { [key]: value } }` | Room-scoped shared JSON — auto-syncs |

### ChatController — Methods (call from event handlers)

| Method | Params | Description |
|---|---|---|
| `setSharedState(key, value)` | `key: string`, `value: any` | Write to app-level shared state. All users see the update instantly. |
| `deleteSharedState(key)` | `key: string` | Remove a key from shared state. |
| `setRoomData(roomId, key, value)` | `roomId: string`, `key: string`, `value: any` | Write JSON scoped to a room. Not visible as a chat message. |
| `deleteRoomData(roomId, key?)` | `roomId: string`, `key?: string` | Remove a key (or all data) from a room. |
| `switchRoom(roomId)` | `roomId: string` | Set the active room. Updates presence and fires `roomSwitched`. |
| `startTyping(roomId?)` | `roomId?: string` | Show typing indicator to other users. |
| `stopTyping()` | — | Hide typing indicator. |
| `setAiThinking(roomId, isThinking)` | `roomId: string`, `isThinking: boolean` | Show/hide AI thinking animation for a room. |
| `setUser(userId, userName)` | `userId: string`, `userName: string` | Update user credentials at runtime. |

### ChatController — Events

| Event | When it fires |
|---|---|
| `Connected` | WebSocket connection established |
| `Disconnected` | WebSocket connection lost |
| `Error` | Connection error occurred |
| `User Joined` | A new user came online |
| `User Left` | A user went offline |
| `Room Switched` | Active room changed (after `switchRoom()`) |
| `Shared State Changed` | Any key in `sharedState` was updated by any user |
| `Room Data Changed` | Any key in `roomData` was updated by any user |
| `AI Thinking Started` | AI started generating in a room |
| `AI Thinking Stopped` | AI finished generating in a room |

### ChatBox — Properties (set in property panel)

| Property | Binding | Description |
|---|---|---|
| `messages` | `{{loadMessages.data}}` | Array of message objects |
| `rooms` | `{{chatController1.sharedState.rooms \|\| []}}` | Array of room objects |
| `currentRoomId` | `{{chatController1.currentRoomId}}` | Active room ID |
| `currentUserId` | `{{chatController1.userId}}` | Current user's ID |
| `currentUserName` | `{{chatController1.userName}}` | Current user's name |
| `typingUsers` | `{{chatController1.typingUsers}}` | Users currently typing |
| `onlineUsers` | `{{chatController1.onlineUsers}}` | Users currently online |
| `isAiThinking` | `{{chatController1.aiThinkingRooms[chatController1.currentRoomId]}}` | AI thinking state |
| `showRoomsPanel` | `true` / `false` | Toggle room sidebar |
| `allowRoomCreation` | `true` / `false` | Show create-room button |

### ChatBox — Events

| Event | What to do |
|---|---|
| `Message Sent` | Run `saveMessage` query, then update roomData |
| `Start Typing` | Call `chatController1.startTyping()` |
| `Stop Typing` | Call `chatController1.stopTyping()` |
| `Room Switch` | Call `chatController1.switchRoom(chatBox1.pendingRoomId)` |
| `Room Create` | Run `createRoom` query, reload rooms, update sharedState |
| `Room Join` | Add user to room members in DB, reload rooms |
| `Room Leave` | Remove user from room members, reload rooms |

### ChatBox — Exposed State (read from other components)

| Property | Description |
|---|---|
| `lastSentMessageText` | The text of the last message the user sent |
| `messageText` | Current text in the input field |
| `pendingRoomId` | Room ID from the last room switch/join/leave click |
| `newRoomName` | Room name from the create-room form |
| `newRoomType` | Room type from the create-room form (`public` / `private` / `llm`) |
| `newRoomDescription` | Description from the create-room form |
| `inviteTargetUserId` | User ID from the invite form |
| `pendingInviteId` | Invite ID from accept/decline |

---

## Data Shapes

### Message Object

```json
{
  "id": "msg_1710600005000_a3kf8j2",
  "roomId": "room_general",
  "text": "Hello everyone!",
  "authorId": "user_alice",
  "authorName": "Alice",
  "timestamp": 1710600005000,
  "authorType": "user"
}
```

`authorType` is optional. Set to `"assistant"` for AI/bot messages to render them with a different bubble style.

### Room Object

```json
{
  "id": "room_general",
  "name": "General",
  "type": "public",
  "description": "Main chat room",
  "members": ["user_alice", "user_bob"],
  "createdBy": "user_alice",
  "createdAt": 1710600000000,
  "llmQueryName": null
}
```

`type` can be `"public"`, `"private"`, or `"llm"` (for AI-powered rooms).

---

## Shared State vs Room Data — When to Use Which

| Scenario | Use | Example |
|---|---|---|
| Room list visible to all users | `setSharedState("rooms", [...])` | Syncs the room sidebar |
| App-wide config or settings | `setSharedState("config", {...})` | Theme, feature flags |
| Any app-wide data | `setSharedState("myKey", value)` | Announcements, counters |
| Invisible JSON data in a room | `setRoomData(roomId, "key", {...})` | KPI dashboard, game state |
| Signal that a message was sent | `setRoomData(roomId, "lastMessage", {...})` | Triggers other users to reload |
| IoT / live sensor data in a room | `setRoomData(roomId, "sensors", {...})` | Real-time feeds |

**Rule of thumb**: If ALL users need it regardless of room → `sharedState`. If it's scoped to a specific room/channel → `roomData`.

---

## Memory and Performance Notes

- **sharedState** and **roomData** use YJS CRDT (via Pluv.io). The data is kept in memory on each connected client.
- Keep shared data small — room metadata, config, signals. A few KB is ideal, up to ~100KB is fine.
- **Do NOT put full message history into shared state.** Messages belong in MongoDB. YJS is for small, frequently-updated JSON that needs real-time sync.
- When you overwrite a key (`setRoomData("room_1", "kpi", newData)`), YJS garbage-collects the old value. The doc size stays proportional to current data, not history.
- Each user downloads the full YJS doc on connect. For a typical chat app with ~10-20 rooms and small per-room data, the doc is under 10KB.

---

## Troubleshooting

### ChatController shows "Connecting..." forever

- Check that `pluv-server.js` is running and reachable
- Verify `VITE_PLUV_PUBLIC_KEY` is set correctly
- Check browser console for auth errors
- If using a proxy (Vite dev server), ensure `/api/auth/pluv` is proxied to port 3006

### Messages don't appear for other users

- Verify the `saveMessage` query is succeeding (check query results)
- Verify you're calling `setRoomData(roomId, "lastMessage", ...)` after save
- Verify the ChatController has a `Room Data Changed` event handler that runs `loadMessages`
- Make sure both users have the same `applicationId` (they must be in the same Pluv room)

### Rooms don't sync across users

- After creating a room, you must call `chatController1.setSharedState("rooms", loadRooms.data)`
- The rooms don't come from the DB automatically — you push them to shared state, then YJS syncs them

### "Room Data Changed" fires but loadMessages returns empty

- Check that `chatController1.currentRoomId` is set (user must have switched to a room)
- Check that the `loadMessages` query filter uses `chatController1.currentRoomId`

---

## Quick Start Checklist

1. [ ] Pluv.io account created, keys obtained
2. [ ] `pluv-server.js` running with env vars set
3. [ ] MongoDB data source configured in Lowcoder
4. [ ] `rooms` and `messages` collections created in MongoDB
5. [ ] Seed room inserted (`room_general`)
6. [ ] Queries created: `loadRooms`, `loadMessages`, `saveMessage`, `createRoom`
7. [ ] ChatController added, configured with applicationId / userId / userName
8. [ ] ChatBox added, properties bound to ChatController + queries
9. [ ] ChatBox events wired: messageSent, startTyping, stopTyping, roomSwitch, roomCreate
10. [ ] ChatController events wired: connected, roomSwitched, roomDataChanged
11. [ ] Open app in two browser windows with different users — test sending messages
