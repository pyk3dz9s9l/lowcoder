# Chat V2 — Complete Reference & Testing Guide

## Architecture

The Chat V2 system is split into two Lowcoder components with a clear separation of concerns:

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| **Brain** | `Chat Signal Controller` | Pluv/Yjs — presence, typing, message notifications, **native room management** |
| **UI** | `Chat Box V2` | Pure display — rooms panel, messages, input bar, modals |
| **Storage** | Your Data Queries | MongoDB, PostgreSQL, REST API — persists messages (and optionally rooms) |

```
┌─────────────────────────────────────────────────────────┐
│                   Chat Box V2 (UI)                       │
│  ┌───────────────┐  ┌──────────────────────────────────┐ │
│  │  Rooms Panel  │  │         Chat Area                │ │
│  │               │  │  Header (Room name / title)      │ │
│  │  🤖 AI Rooms  │  │  MessageList                     │ │
│  │  🌐 Public    │  │    - User bubbles                │ │
│  │  🔒 Private   │  │    - AI bubbles (with Markdown)  │ │
│  │               │  │  InputBar                        │ │
│  └───────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
          ↕ events / bound props
┌─────────────────────────────────────────────────────────┐
│            Chat Signal Controller (Brain)                │
│  Pluv/Yjs real-time signal layer                         │
│  • Presence (who is online)                              │
│  • Typing indicators                                     │
│  • Message-activity broadcasts                           │
│  • Native room CRUD (rooms YMap in Yjs)                  │
│  • Invite system (invites YMap in Yjs)                   │
└─────────────────────────────────────────────────────────┘
          ↕ Pluv WebSocket
┌─────────────────────────────────────────────────────────┐
│                  Pluv Auth Server                        │
│  node pluv-server.js  (port 3006)                        │
└─────────────────────────────────────────────────────────┘
```

> **Message storage is always your responsibility.** Pluv/Yjs only carries ephemeral real-time data (who is online, typing, new-message notifications). Use any database or API for messages — and optionally for rooms too.

---

## File Structure

```
chatBoxComponentv2/
├── chatBoxComp.tsx              # Lowcoder component definition (props, events, exposed state)
├── index.tsx                    # Public export
├── styles.ts                    # All styled-components
├── useChatStore.ts              # Deprecated (kept for reference)
├── store/
│   ├── index.ts                 # Re-exports all public types + Pluv hooks
│   ├── types.ts                 # TypeScript interfaces: ChatRoom, ChatMessage, etc.
│   └── pluvClient.ts            # Pluv client + React bundle (useStorage, useMyPresence, …)
└── components/
    ├── ChatBoxView.tsx           # Main view — composes RoomPanel + MessageList + InputBar
    ├── MessageList.tsx           # Message bubbles, AI bubbles, typing indicator
    ├── InputBar.tsx              # Textarea + send button
    ├── RoomPanel.tsx             # Sidebar: room list, search, invites, create button
    ├── CreateRoomModal.tsx       # Modal: create public / private / LLM room
    └── InviteUserModal.tsx       # Modal: invite user to a private room

hooks/
└── chatControllerV2Comp.tsx     # Chat Signal Controller — the "brain" component
```

---

## Data Structures

All types are exported from `./store`.

### `ChatRoom`

Stored in the Pluv Yjs `rooms` YMap — synced in real-time to all connected users.

```typescript
interface ChatRoom {
  id: string;                          // auto-generated uid
  name: string;                        // display name
  type: "public" | "private" | "llm"; // room visibility / mode
  description?: string;                // optional subtitle
  members: string[];                   // array of userId strings
                                       //   public → empty (everyone can see/join)
                                       //   private → tracked member list
                                       //   llm → tracked member list
  createdBy?: string;                  // userId of creator
  createdAt?: number;                  // Unix ms timestamp
  llmQueryName?: string;               // for "llm" rooms: name of the Lowcoder query to call
}
```

**Room type behaviour:**

| Type | Who can see it | Members array | Invites |
|------|---------------|---------------|---------|
| `public` | Everyone (exposed in `rooms`) | Empty — anyone can join | — |
| `private` | Only listed members (in `userRooms`) | Populated — join-by-invite | ✅ |
| `llm` | Listed members | Populated | ✅ |

---

### `ChatMessage`

Your database schema — the Chat Box V2 reads these fields flexibly:

```typescript
interface ChatMessage {
  // Preferred field names → fallbacks (any of these will work)
  id: string;          // or: _id
  text: string;        // or: message, content
  authorId: string;    // or: userId, author_id, sender
  authorName: string;  // or: userName, author_name, senderName
  timestamp: number;   // or: createdAt, created_at, time (ISO string also works)

  // Optional — controls rendering style
  authorType?: "user" | "assistant";  // "assistant" → AI bubble with Markdown + copy button
  // Any extra fields pass through and are ignored
  [key: string]: any;
}
```

Example stored document:

```json
{
  "id": "1714500000000_abc123xyz",
  "roomId": "room_general",
  "text": "Hello everyone! 👋",
  "authorId": "user_42",
  "authorName": "Alice",
  "timestamp": 1714500000000
}
```

---

### `PendingRoomInvite`

Stored in the Pluv Yjs `invites` YMap. Auto-filtered per user.

```typescript
interface PendingRoomInvite {
  id: string;           // auto-generated uid
  roomId: string;       // target room
  roomName: string;     // display name (denormalised for the invite card)
  fromUserId: string;   // who sent the invite
  fromUserName: string; // display name of sender
  toUserId: string;     // recipient — filtered to show only your invites
  timestamp: number;    // Unix ms
}
```

---

### `TypingUser`

Emitted by the controller via Pluv presence. Scoped to `currentRoomId`.

```typescript
interface TypingUser {
  userId: string;
  userName: string;
  roomId?: string;  // room they are typing in
}
```

---

### `OnlineUser`

All connected users sharing the same `applicationId` signal room.

```typescript
interface OnlineUser {
  userId: string;
  userName: string;
  currentRoomId: string | null;  // room they are currently viewing
}
```

---

### `MessageBroadcast`

Written to the Pluv `messageActivity` YMap when a user saves a message. Triggers the `newMessageBroadcast` event on all peers.

```typescript
interface MessageBroadcast {
  roomId: string;
  messageId: string;
  authorId: string;
  authorName: string;
  timestamp: number;
  counter: number;  // monotonic counter — used to detect new broadcasts
}
```

---

## Prerequisites

### 1. Pluv.io Account

Sign up at [pluv.io](https://pluv.io) and create a project. You need:

- **Publishable Key** (`pk_...`) — goes into the Chat Signal Controller's "Public Key" property
- **Secret Key** (`sk_...`) — stays on the server only

### 2. Pluv Auth Server

The auth server mints short-lived tokens for Pluv connections.

```bash
cd client/packages/lowcoder

# Provide your Pluv keys
export PLUV_PUBLISHABLE_KEY="pk_..."
export PLUV_SECRET_KEY="sk_..."

# Start (defaults to port 3006)
npm run start:pluv
# or directly:
node pluv-server.js
```

Verify it's running:

```bash
curl http://localhost:3006/health
# → { "status": "healthy", "server": "pluv-chat", ... }

curl "http://localhost:3006/api/auth/pluv?room=signal_myapp&userId=user_1&userName=Alice"
# → { "token": "..." }
```

---

## Quick Start — Full Chat in 5 Steps

### Step 1 — Add `Chat Signal Controller`

1. Open **Insert panel** → search **"Chat Signal Controller"** (under Collaboration)
2. Drag onto canvas — it is headless (no visual output, renders nothing)
3. Configure in the right-side property panel:

| Property | Example value | Notes |
|----------|--------------|-------|
| Application ID | `my_app` | All users with the same ID share presence |
| User ID | `{{ currentUser.id }}` | Unique per user |
| User Name | `{{ currentUser.name }}` | Display name |
| Public Key | `pk_live_...` | From pluv.io dashboard |
| Auth URL | `http://localhost:3006/api/auth/pluv` | Your running auth server |

The component is typically named `chatController1` automatically.

---

### Step 2 — Add `Chat Box V2`

1. In Insert panel, search **"Chat Box V2"** → drag onto canvas
2. Configure:

| Property | Bind to | Notes |
|----------|---------|-------|
| Messages | `{{ loadMessages.data }}` | Your load query |
| Current User ID | `{{ chatController1.userId }}` | Drives own-vs-other bubble alignment |
| Current User Name | `{{ chatController1.userName }}` | — |
| Typing Users | `{{ chatController1.typingUsers }}` | Typing indicator |
| Rooms | `{{ chatController1.userRooms }}` | Rooms visible to this user |
| Current Room ID | `{{ chatController1.currentRoomId }}` | Highlights active room |
| Pending Invites | `{{ chatController1.pendingInvites }}` | Invite cards in room panel |
| Show Rooms Panel | `true` | Set to `false` to hide the sidebar |

---

### Step 3 — Create Data Queries

You need at minimum: **loadMessages** and **saveMessage**.

#### `loadMessages` — MongoDB example

```js
// Collection: chat_messages
// Operation: Find
// Filter:
{ "roomId": "{{ chatController1.currentRoomId || 'general' }}" }
// Sort:
{ "timestamp": 1 }
```

#### `loadMessages` — REST API example

```
GET https://your-api.com/messages?roomId={{ chatController1.currentRoomId || 'general' }}
```

#### `saveMessage` — MongoDB example

```js
// Collection: chat_messages
// Operation: Insert
{
  "id":         "{{ uid() }}",
  "roomId":     "{{ chatController1.currentRoomId || 'general' }}",
  "text":       "{{ chatBox1.lastSentMessageText }}",
  "authorId":   "{{ chatController1.userId }}",
  "authorName": "{{ chatController1.userName }}",
  "timestamp":  "{{ Date.now() }}"
}
```

---

### Step 4 — Wire Up Events

#### On `Chat Box V2` (chatBox1):

| Event | Actions to run | Notes |
|-------|---------------|-------|
| **Message Sent** | 1. `saveMessage.run()`<br>2. `chatController1.broadcastNewMessage(chatController1.currentRoomId)`<br>3. `loadMessages.run()` | Order matters: save → broadcast → reload |
| **Start Typing** | `chatController1.startTyping(chatController1.currentRoomId)` | — |
| **Stop Typing** | `chatController1.stopTyping()` | — |
| **Room Switch** | `chatController1.switchRoom(chatBox1.pendingRoomId)` then `loadMessages.run()` | User clicked a room they're already in |
| **Room Join** | `chatController1.joinRoom(chatBox1.pendingRoomId)` then `loadMessages.run()` | User joined from search |
| **Room Leave** | `chatController1.leaveRoom(chatBox1.pendingRoomId)` | — |
| **Room Create** | `chatController1.createRoom(chatBox1.newRoomName, chatBox1.newRoomType, chatBox1.newRoomDescription, chatBox1.newRoomLlmQuery)` | — |
| **Invite Send** | `chatController1.sendInvite(chatController1.currentRoomId, chatBox1.inviteTargetUserId)` | Private rooms only |
| **Invite Accept** | `chatController1.acceptInvite(chatBox1.pendingInviteId)` then `loadMessages.run()` | — |
| **Invite Decline** | `chatController1.declineInvite(chatBox1.pendingInviteId)` | — |

#### On `Chat Signal Controller` (chatController1):

| Event | Actions to run | Notes |
|-------|---------------|-------|
| **New Message Broadcast** | `loadMessages.run()` | A peer saved a message — reload |
| **Connected** | `loadMessages.run()` | Initial load |
| **Room Switched** | `loadMessages.run()` | Active room changed |
| **Room Joined** | `loadMessages.run()` | Joined a new room |

---

### Step 5 — Test

1. Open your app in **two browser tabs** (or two different browsers)
2. Ensure each tab has a different User ID
3. Tab A types → Tab B sees the typing indicator
4. Tab A sends → Tab B's `newMessageBroadcast` fires → messages reload

---

## Rooms Deep Dive

### How Native Rooms Work

Rooms are stored in a **Yjs YMap** (`rooms`) inside the Pluv signal room. This means:

- ✅ Room creation/deletion is instantly synced to all connected users
- ✅ Member lists are updated in real-time
- ✅ No database queries needed just to switch or create rooms
- ⚠️ Rooms are **ephemeral by default** — if you want persistence across sessions, persist them to your database on the `roomCreated` controller event

### Room Panel UI

The built-in sidebar groups rooms by type:

```
Rooms                    [+]
─────────────────────────────
AI ROOMS
  🤖 GPT Assistant       AI
PUBLIC
  🌐 General
  🌐 Announcements
PRIVATE
  🔒 Design Team
  🔒 Backend Squad
─────────────────────────────
[Search public rooms...]
```

- Click a room → fires **Room Switch** event
- Click a room from search → fires **Room Join** event
- Hover active room → leave button (🚪) appears
- `+` button → opens **Create Room** modal
- Invite icon → opens **Invite User** modal (only shown for private rooms)
- Pending invite cards appear above the list with Accept/Decline buttons

### Public Rooms

Visible to everyone in the signal room. No membership tracking. Anyone can join via search.

```
createRoom("General Chat", "public", "For everyone")
```

### Private Rooms

Members-only. The creator is auto-added to the members list. Others join by invite.

```
createRoom("Backend Team", "private", "Internal discussions")
// Then invite someone:
sendInvite(roomId, "user_99", "Bob")
```

### LLM / AI Rooms

A special room type where every user message automatically triggers a Lowcoder query (your AI backend). The response is broadcast to all room members.

```
createRoom("GPT Assistant", "llm", "Ask anything", "getAIResponse")
```

The `llmQueryName` field stores the **exact name of a Lowcoder query** you've created. Your query receives:

```json
{
  "prompt": "the user's message text",
  "roomId": "the room id",
  "conversationHistory": [ ...recent messages array... ]
}
```

> **Note:** LLM query invocation from the room context is wired externally via events — the component fires events and you handle the AI response in your query logic. The `llmQueryName` field is stored on the room so the developer knows which query to call.

### Persisting Rooms to a Database

Wire the `roomCreated` event on the controller to your save query:

```js
// On chatController1 → roomCreated event:
saveRoom.run()

// saveRoom query document:
{
  "id":          "{{ chatController1.currentRoomId }}",
  "name":        "{{ chatController1.rooms.find(r => r.id === chatController1.currentRoomId)?.name }}",
  "type":        "{{ chatController1.rooms.find(r => r.id === chatController1.currentRoomId)?.type }}",
  "createdBy":   "{{ chatController1.userId }}",
  "createdAt":   "{{ Date.now() }}"
}
```

---

## Controller Reference (`chatController1`)

### Properties (read via `{{ chatController1.propertyName }}`)

| Property | Type | Description |
|----------|------|-------------|
| `ready` | `boolean` | `true` when connected to the Pluv signal server |
| `connectionStatus` | `string` | `"Online"` · `"Connecting..."` · `"Offline"` |
| `error` | `string \| null` | Error message from auth or connection failure |
| `userId` | `string` | Current user's ID |
| `userName` | `string` | Current user's display name |
| `applicationId` | `string` | Scope ID — all users sharing this see each other |
| `currentRoomId` | `string \| null` | Currently active room ID |
| `onlineUsers` | `OnlineUser[]` | All users connected to the signal room |
| `typingUsers` | `TypingUser[]` | Users currently typing, scoped to `currentRoomId` |
| `lastMessageNotification` | `MessageBroadcast \| null` | Last broadcast from a peer |
| `rooms` | `ChatRoom[]` | **All** rooms in the Yjs store |
| `userRooms` | `ChatRoom[]` | Rooms visible to this user (all public + private rooms they are a member of) |
| `pendingInvites` | `PendingRoomInvite[]` | Invites addressed to the current user |

---

### Events (fire on `chatController1`)

| Event | When fired | Typical action |
|-------|-----------|----------------|
| `connected` | Pluv WebSocket opened | `loadMessages.run()` |
| `disconnected` | Pluv WebSocket closed | Show offline indicator |
| `error` | Auth or connection failure | Show error toast |
| `userJoined` | A peer came online | Update online badge |
| `userLeft` | A peer went offline | Update online badge |
| `newMessageBroadcast` | A peer saved a message | `loadMessages.run()` |
| `roomCreated` | A new room was created | Persist to DB (optional) |
| `roomJoined` | Current user joined a room | `loadMessages.run()` |
| `roomLeft` | Current user left a room | Clear message list |
| `roomSwitched` | Active room changed | `loadMessages.run()` |

---

### Methods (call as `chatController1.methodName(args)`)

#### Messaging

| Method | Parameters | Description |
|--------|-----------|-------------|
| `broadcastNewMessage(roomId, messageId?)` | `roomId: string`, `messageId?: string` | Notify all peers a message was saved in `roomId`. Triggers their `newMessageBroadcast` event. |
| `startTyping(roomId?)` | `roomId?: string` | Set this user's typing presence. Optional override — defaults to `currentRoomId`. |
| `stopTyping()` | — | Clear typing presence. |

#### Identity

| Method | Parameters | Description |
|--------|-----------|-------------|
| `setUser(userId, userName)` | `userId: string`, `userName: string` | Update user identity at runtime. |

#### Room Management

| Method | Parameters | Description |
|--------|-----------|-------------|
| `switchRoom(roomId)` | `roomId: string` | Set active room context. Updates presence. Fires `roomSwitched`. |
| `createRoom(name, type, description?, llmQueryName?)` | `name: string`, `type: "public"\|"private"\|"llm"`, `description?: string`, `llmQueryName?: string` | Create a new room in Yjs. Creator is auto-joined. Fires `roomCreated`. |
| `joinRoom(roomId)` | `roomId: string` | Add current user to room members + switch to it. Fires `roomJoined`. |
| `leaveRoom(roomId)` | `roomId: string` | Remove current user from room members. Clears `currentRoomId` if it was the active room. Fires `roomLeft`. |
| `deleteRoom(roomId)` | `roomId: string` | Remove the room from Yjs entirely (for all users). |

#### Invites (Private Rooms)

| Method | Parameters | Description |
|--------|-----------|-------------|
| `sendInvite(roomId, toUserId, toUserName?)` | `roomId: string`, `toUserId: string`, `toUserName?: string` | Write an invite to the Yjs `invites` YMap. Only works for private rooms. |
| `acceptInvite(inviteId)` | `inviteId: string` | Join the room and delete the invite. |
| `declineInvite(inviteId)` | `inviteId: string` | Delete the invite without joining. |

---

## Chat Box Reference (`chatBox1`)

### Properties (read via `{{ chatBox1.propertyName }}`)

| Property | Type | Description |
|----------|------|-------------|
| `chatTitle` | `string` | The configured title (shown in header when no room is active) |
| `lastSentMessageText` | `string` | Text of the last message the user sent — use in your save query |
| `messageText` | `string` | Live draft text currently in the input bar |
| `pendingRoomId` | `string` | Room ID the user wants to switch to / join / leave |
| `newRoomName` | `string` | Name from the Create Room form |
| `newRoomType` | `string` | `"public"` · `"private"` · `"llm"` |
| `newRoomDescription` | `string` | Description from the Create Room form |
| `newRoomLlmQuery` | `string` | Query name from the Create Room form (LLM rooms) |
| `inviteTargetUserId` | `string` | User ID entered in the Invite User form |
| `pendingInviteId` | `string` | Invite ID being accepted or declined |

### Configuration Props

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Messages | `ChatMessage[]` | `[]` | Bind to `{{ loadMessages.data }}` |
| Current User ID | `string` | `"user_1"` | Bind to `{{ chatController1.userId }}` |
| Current User Name | `string` | `"User"` | — |
| Typing Users | `TypingUser[]` | `[]` | Bind to `{{ chatController1.typingUsers }}` |
| Rooms | `ChatRoom[]` | `[]` | Bind to `{{ chatController1.userRooms }}` |
| Current Room ID | `string` | `""` | Bind to `{{ chatController1.currentRoomId }}` |
| Pending Invites | `PendingRoomInvite[]` | `[]` | Bind to `{{ chatController1.pendingInvites }}` |
| Show Rooms Panel | `boolean` | `true` | Toggle the left sidebar |
| Panel Width | `string` | `"240px"` | CSS width of the sidebar |
| Allow Room Creation | `boolean` | `true` | Show/hide the `+` button |
| Allow Room Search | `boolean` | `true` | Show/hide the search input |
| Show Header | `boolean` | `true` | Show/hide the chat header bar |

---

### Events (fire on `chatBox1`)

#### Messaging

| Event | When | Read state |
|-------|------|------------|
| `messageSent` | User presses Enter or Send | `chatBox1.lastSentMessageText` |
| `startTyping` | User starts typing | — |
| `stopTyping` | User is idle for 2 seconds | — |

#### Room Interactions

| Event | When | Read state |
|-------|------|------------|
| `roomSwitch` | User clicked a room they are already in | `chatBox1.pendingRoomId` |
| `roomJoin` | User clicked a room from search results | `chatBox1.pendingRoomId` |
| `roomLeave` | User clicked the leave (🚪) icon | `chatBox1.pendingRoomId` |
| `roomCreate` | User submitted the Create Room form | `chatBox1.newRoomName`, `chatBox1.newRoomType`, `chatBox1.newRoomDescription`, `chatBox1.newRoomLlmQuery` |

#### Invite Interactions

| Event | When | Read state |
|-------|------|------------|
| `inviteSend` | User submitted the Invite User form | `chatBox1.inviteTargetUserId` |
| `inviteAccept` | User clicked Accept on an invite card | `chatBox1.pendingInviteId` |
| `inviteDecline` | User clicked Decline on an invite card | `chatBox1.pendingInviteId` |

---

## Complete Wiring Cheatsheet

```
chatController1.userRooms  ──────────→  chatBox1.rooms
chatController1.currentRoomId  ──────→  chatBox1.currentRoomId
chatController1.typingUsers  ────────→  chatBox1.typingUsers
chatController1.pendingInvites  ─────→  chatBox1.pendingInvites
chatController1.userId  ─────────────→  chatBox1.currentUserId

Event flow (chatBox1 → chatController1):

chatBox1[messageSent]   → saveMessage.run()
                        → chatController1.broadcastNewMessage(chatController1.currentRoomId)
                        → loadMessages.run()

chatBox1[startTyping]   → chatController1.startTyping(chatController1.currentRoomId)
chatBox1[stopTyping]    → chatController1.stopTyping()

chatBox1[roomSwitch]    → chatController1.switchRoom(chatBox1.pendingRoomId)
                        → loadMessages.run()

chatBox1[roomJoin]      → chatController1.joinRoom(chatBox1.pendingRoomId)
                        → loadMessages.run()

chatBox1[roomLeave]     → chatController1.leaveRoom(chatBox1.pendingRoomId)

chatBox1[roomCreate]    → chatController1.createRoom(
                            chatBox1.newRoomName,
                            chatBox1.newRoomType,
                            chatBox1.newRoomDescription,
                            chatBox1.newRoomLlmQuery
                          )

chatBox1[inviteSend]    → chatController1.sendInvite(
                            chatController1.currentRoomId,
                            chatBox1.inviteTargetUserId
                          )

chatBox1[inviteAccept]  → chatController1.acceptInvite(chatBox1.pendingInviteId)
                        → loadMessages.run()

chatBox1[inviteDecline] → chatController1.declineInvite(chatBox1.pendingInviteId)

Event flow (chatController1 internal):

chatController1[connected]          → loadMessages.run()
chatController1[newMessageBroadcast]→ loadMessages.run()
chatController1[roomSwitched]       → loadMessages.run()
chatController1[roomJoined]         → loadMessages.run()
```

---

## LLM / AI Room Setup

1. Create a Lowcoder query (e.g. `getAIResponse`) that calls your AI backend
2. The query receives these input arguments:

   ```json
   {
     "prompt": "What is the capital of France?",
     "roomId": "room_abc123",
     "conversationHistory": [
       { "authorType": "user", "text": "...", "authorId": "user_1" },
       { "authorType": "assistant", "text": "...", "authorId": "__llm_bot__" }
     ]
   }
   ```

3. In the Create Room form in the UI, set **AI Room** mode and enter `getAIResponse` as the query name
4. On `chatBox1[messageSent]`, check if the current room is an LLM room and run the query:

   ```js
   // Conditional action:
   if (chatController1.rooms.find(r => r.id === chatController1.currentRoomId)?.type === 'llm') {
     getAIResponse.run();
   }
   ```

5. AI responses should be saved to your messages collection with `authorId: "__llm_bot__"` and `authorType: "assistant"` — the UI will render them with the purple AI bubble and Markdown support

---

## Local Development & Testing

### 1. Start the Pluv Auth Server

```bash
cd client/packages/lowcoder
export PLUV_PUBLISHABLE_KEY="pk_..."
export PLUV_SECRET_KEY="sk_..."
node pluv-server.js
```

### 2. Start the Lowcoder Frontend Dev Server

```bash
cd client/packages/lowcoder
yarn dev
# or
npm run dev
```

### 3. Open the App

Open `http://localhost:3000` (or your configured dev port) in two browser tabs.

### 4. Minimal Smoke Test (No Database)

You can test real-time features without a database by using static messages:

- Set `chatBox1.messages` to a static JSON array in the property panel:
  ```json
  [
    { "id": "1", "text": "Hello!", "authorId": "user_1", "authorName": "Alice", "timestamp": 1714500000000 },
    { "id": "2", "text": "Hey there!", "authorId": "user_2", "authorName": "Bob", "timestamp": 1714500001000 }
  ]
  ```
- This lets you verify presence, typing, and room switching without a live database

### 5. Full Stack Test

| What to test | How |
|-------------|-----|
| Pluv connection | `{{ chatController1.connectionStatus }}` shows `"Online"` |
| Presence | Open 2 tabs → `{{ chatController1.onlineUsers }}` shows both users |
| Typing | Tab A types → Tab B sees typing indicator below message list |
| Room creation | Click `+` in rooms panel → fill form → room appears in both tabs |
| Room search | Type in search box → public rooms filter live (client-side) |
| Private invite | Create a private room in Tab A → invite Tab B's userId → Tab B sees invite card |
| Invite accept | Tab B clicks Accept → both tabs see Tab B in the room's members |
| Message broadcast | Tab A sends message → Tab B's `newMessageBroadcast` fires → messages reload |
| LLM room | Create an LLM room → sending a message triggers your AI query |

---

## Testing Checklist

### Infrastructure
- [ ] Pluv auth server running on port 3006
- [ ] `curl http://localhost:3006/health` returns `{"status":"healthy",...}`
- [ ] Lowcoder dev server running

### Controller Setup
- [ ] `chatController1.connectionStatus` shows `"Online"`
- [ ] `chatController1.ready` is `true`
- [ ] `chatController1.userId` and `userName` are set correctly

### Messaging (single tab)
- [ ] Type a message → `chatBox1.messageText` updates live
- [ ] Send → `chatBox1.lastSentMessageText` holds the sent text
- [ ] `messageSent` event fires
- [ ] Save query runs successfully
- [ ] `broadcastNewMessage` called
- [ ] Messages reload

### Real-time (two tabs)
- [ ] Tab A online → `onlineUsers` in Tab B shows Tab A
- [ ] Tab A closes → `userLeft` fires in Tab B
- [ ] Tab A types → Tab B sees typing indicator
- [ ] Tab A stops typing (2s idle) → indicator disappears in Tab B
- [ ] Tab A sends message → Tab B's `newMessageBroadcast` fires → messages reload
- [ ] Both tabs show the same rooms list

### Rooms
- [ ] Click `+` → Create Room modal opens
- [ ] Create a **public** room → appears in both tabs immediately
- [ ] Create a **private** room → only appears for creator
- [ ] Search finds public rooms
- [ ] Join from search → user added to members
- [ ] Leave room → user removed from members
- [ ] Switching rooms updates `currentRoomId` in controller
- [ ] Message load query filters to the correct room

### Invites
- [ ] Tab A invites Tab B to a private room → Tab B sees invite card
- [ ] Tab B accepts → Tab B is now in the room, invite disappears
- [ ] Tab B declines → invite disappears, Tab B not in the room

### LLM Room
- [ ] Create LLM room with a valid query name
- [ ] Send message → your AI query fires
- [ ] AI response saved with `authorType: "assistant"` → purple bubble renders

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `connectionStatus` stuck at `"Connecting..."` | Auth server not running or wrong URL | Verify `node pluv-server.js` is running; check Auth URL property |
| `Auth failed` in console | Wrong Pluv keys | Check `pk_...` matches the project in pluv.io dashboard |
| Rooms list empty | Not bound to `userRooms` | Set chatBox1.rooms to `{{ chatController1.userRooms }}` |
| Private room not visible | User not in members | Accept an invite or `joinRoom()` |
| Typing indicator not showing | Typing events not wired | Wire `startTyping` → `chatController1.startTyping()` |
| Messages don't reload on peer send | Broadcast event not wired | Wire `newMessageBroadcast` → `loadMessages.run()` on the controller |
| Own messages appear as "other" | Wrong currentUserId | Bind `chatBox1.currentUserId` to `{{ chatController1.userId }}` |
| AI bubble not rendering | `authorType` missing | Save AI messages with `authorType: "assistant"` or `authorId: "__llm_bot__"` |
| Rooms disappear on refresh | Yjs rooms are ephemeral | Persist rooms to DB on `roomCreated` event |
| Invite not received | Pluv not connected | Both users must be in the same `applicationId` signal room |
