import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Section, sectionNames } from "lowcoder-design";
import {
  simpleMultiComp,
  stateComp,
  withDefault,
  withPropertyViewFn,
  withViewFn,
} from "../generators";
import { NameConfig, withExposingConfigs } from "../generators/withExposing";
import { withMethodExposing } from "../generators/withMethodExposing";
import { stringExposingStateControl } from "comps/controls/codeStateControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { JSONObject } from "../../util/jsonTypes";
import { isEmpty, omit, isEqual } from "lodash";
import {
  PluvRoomProvider,
  useStorage,
  useMyPresence,
  useOthers,
  useConnection,
} from "../comps/chatBoxComponentv2/store";
import type {
  AiThinkingState,
  OnlineUser,
  TypingUser,
} from "../comps/chatBoxComponentv2/store";

// ─── Event definitions ──────────────────────────────────────────────────────

const ChatControllerEvents = [
  {
    label: "User Joined",
    value: "userJoined",
    description: "A user came online in this application",
  },
  {
    label: "User Left",
    value: "userLeft",
    description: "A user went offline",
  },
  {
    label: "Room Switched",
    value: "roomSwitched",
    description: "Active room changed. Read currentRoomId.",
  },
  {
    label: "Connected",
    value: "connected",
    description: "Connected to the signal server",
  },
  {
    label: "Disconnected",
    value: "disconnected",
    description: "Disconnected from the signal server",
  },
  {
    label: "Error",
    value: "error",
    description: "A connection error occurred",
  },
  {
    label: "AI Thinking Started",
    value: "aiThinkingStarted",
    description: "The AI assistant started generating a response in a room",
  },
  {
    label: "AI Thinking Stopped",
    value: "aiThinkingStopped",
    description: "The AI assistant finished (or was cancelled) in a room",
  },
  {
    label: "Shared State Changed",
    value: "sharedStateChanged",
    description:
      "The app-level shared state was updated by any user. Read chatController.sharedState to get the current state.",
  },
  {
    label: "Room Data Changed",
    value: "roomDataChanged",
    description:
      "Room-scoped shared data was updated by any user. Read chatController.roomData to get the current data.",
  },
] as const;

// ─── Children map ───────────────────────────────────────────────────────────

const childrenMap = {
  applicationId: stringExposingStateControl("applicationId", "lowcoder_app"),
  userId: stringExposingStateControl("userId", "user_1"),
  userName: stringExposingStateControl("userName", "User"),

  onEvent: eventHandlerControl(ChatControllerEvents),

  ready: stateComp<boolean>(false),
  error: stateComp<string | null>(null),
  connectionStatus: stateComp<string>("Connecting..."),
  onlineUsers: stateComp<JSONObject[]>([]),
  typingUsers: stateComp<JSONObject[]>([]),
  currentRoomId: stateComp<string | null>(null),
  aiThinkingRooms: stateComp<JSONObject>({}),
  sharedState: stateComp<JSONObject>({}),
  roomData: stateComp<JSONObject>({}),

  _signalActions: stateComp<JSONObject>({}),
};

// ─── Signal actions interface ────────────────────────────────────────────────

interface SignalActions {
  startTyping: (roomId?: string) => void;
  stopTyping: () => void;
  switchRoom: (roomId: string) => void;
  setAiThinking: (roomId: string, isThinking: boolean) => void;
  setSharedState: (key: string, value: any) => void;
  deleteSharedState: (key: string) => void;
  setRoomData: (roomId: string, key: string, value: any) => void;
  deleteRoomData: (roomId: string, key?: string) => void;
}

// ─── Inner component that uses Pluv hooks inside PluvRoomProvider ────────────

interface SignalControllerProps {
  comp: any;
  userId: string;
  userName: string;
}

const SignalController = React.memo(
  ({ comp, userId, userName }: SignalControllerProps) => {
    const connection = useConnection();
    const [, setMyPresence] = useMyPresence();
    const others = useOthers();
    const [aiActivity, aiActivityYMap] = useStorage("aiActivity");
    const [sharedStateData, sharedStateYMap] = useStorage("sharedState");
    const [roomDataData, roomDataYMap] = useStorage("roomData");

    const compRef = useRef(comp);
    compRef.current = comp;

    const triggerEvent = comp.children.onEvent.getView();
    const triggerEventRef = useRef(triggerEvent);
    triggerEventRef.current = triggerEvent;

    const prevRef = useRef<{
      ready: boolean;
      onlineCount: number;
      initialized: boolean;
      aiThinkingRooms: Record<string, boolean>;
      sharedState: JSONObject | null;
      roomData: JSONObject | null;
    }>({
      ready: false,
      onlineCount: 0,
      initialized: false,
      aiThinkingRooms: {},
      sharedState: null,
      roomData: null,
    });

    // ── Connection state ──────────────────────────────────────────────
    const ready = connection.state === "open";
    const connectionLabel = useMemo(() => {
      if (connection.state === "open") return "Online";
      if (connection.state === "connecting") return "Connecting...";
      return "Offline";
    }, [connection.state]);

    useEffect(() => {
      compRef.current.children.ready.dispatchChangeValueAction(ready);
      compRef.current.children.connectionStatus.dispatchChangeValueAction(connectionLabel);
      if (ready && !prevRef.current.ready) {
        triggerEventRef.current("connected");
      }
      if (!ready && prevRef.current.ready) {
        triggerEventRef.current("disconnected");
      }
      prevRef.current.ready = ready;
    }, [ready, connectionLabel]);

    // ── Online users ──────────────────────────────────────────────────
    const onlineUsers = useMemo<OnlineUser[]>(() => {
      const users = others
        .filter((o: any) => o.presence != null)
        .map((o: any) => ({
          userId: o.presence.userId as string,
          userName: o.presence.userName as string,
          currentRoomId: (o.presence.currentRoomId as string) || null,
        }));
      // DEBUG: Remove after fixing presence sync issue
      console.log("[ChatController] others count:", others.length, "onlineUsers:", users.length, "users:", users.map(u => u.userId));
      return users;
    }, [others]);

    useEffect(() => {
      compRef.current.children.onlineUsers.dispatchChangeValueAction(
        onlineUsers as unknown as JSONObject[],
      );
      if (prevRef.current.initialized) {
        if (onlineUsers.length > prevRef.current.onlineCount) {
          triggerEventRef.current("userJoined");
        } else if (onlineUsers.length < prevRef.current.onlineCount) {
          triggerEventRef.current("userLeft");
        }
      }
      prevRef.current.onlineCount = onlineUsers.length;
      prevRef.current.initialized = true;
    }, [onlineUsers]);

    // ── Typing users ──────────────────────────────────────────────────
    const currentRoomId = comp.children.currentRoomId.getView() as string | null;

    const typingUsers = useMemo<TypingUser[]>(() => {
      return others
        .filter((o: any) => {
          if (!o.presence?.typing) return false;
          if (o.presence.userId === userId) return false;
          if (currentRoomId && o.presence.currentRoomId !== currentRoomId)
            return false;
          return true;
        })
        .map((o: any) => ({
          userId: o.presence.userId as string,
          userName: o.presence.userName as string,
          roomId: o.presence.currentRoomId as string,
        }));
    }, [others, currentRoomId, userId]);

    useEffect(() => {
      compRef.current.children.typingUsers.dispatchChangeValueAction(
        typingUsers as unknown as JSONObject[],
      );
    }, [typingUsers]);

    // ── Watch AI activity (thinking state per room) ───────────────
    useEffect(() => {
      if (!aiActivity) return;
      const activityRecord = aiActivity as Record<string, AiThinkingState>;
      const nextThinking: Record<string, boolean> = {};

      for (const [roomId, state] of Object.entries(activityRecord)) {
        nextThinking[roomId] = state.isThinking;
        const prev = prevRef.current.aiThinkingRooms[roomId] ?? false;
        if (state.isThinking && !prev) {
          triggerEventRef.current("aiThinkingStarted");
        } else if (!state.isThinking && prev) {
          triggerEventRef.current("aiThinkingStopped");
        }
      }

      prevRef.current.aiThinkingRooms = nextThinking;
      compRef.current.children.aiThinkingRooms.dispatchChangeValueAction(
        nextThinking as unknown as JSONObject,
      );
    }, [aiActivity]);

    // ── Watch shared state ──────────────────────────────────────────
    useEffect(() => {
      if (!sharedStateData) return;
      const next = sharedStateData as unknown as JSONObject;
      if (isEqual(next, prevRef.current.sharedState)) return;
      prevRef.current.sharedState = next;
      compRef.current.children.sharedState.dispatchChangeValueAction(next);
      if (prevRef.current.initialized) {
        triggerEventRef.current("sharedStateChanged");
      }
    }, [sharedStateData]);

    // ── Watch room data ──────────────────────────────────────────────
    useEffect(() => {
      if (!roomDataData) return;
      const next = roomDataData as unknown as JSONObject;
      if (isEqual(next, prevRef.current.roomData)) return;
      prevRef.current.roomData = next;
      compRef.current.children.roomData.dispatchChangeValueAction(next);
      if (prevRef.current.initialized) {
        triggerEventRef.current("roomDataChanged");
      }
    }, [roomDataData]);

    // ── Actions for method invocation ─────────────────────────────────

    const startTyping = useCallback(
      (roomId?: string) => {
        setMyPresence({
          userId,
          userName,
          currentRoomId: roomId || currentRoomId || null,
          typing: true,
        } as any);
      },
      [setMyPresence, userId, userName, currentRoomId],
    );

    const stopTyping = useCallback(() => {
      setMyPresence({
        userId,
        userName,
        currentRoomId: currentRoomId,
        typing: false,
      } as any);
    }, [setMyPresence, userId, userName, currentRoomId]);

    const switchRoom = useCallback(
      (roomId: string) => {
        compRef.current.children.currentRoomId.dispatchChangeValueAction(roomId);
        setMyPresence({
          userId,
          userName,
          currentRoomId: roomId,
          typing: false,
        } as any);
        triggerEventRef.current("roomSwitched");
      },
      [setMyPresence, userId, userName],
    );

    const setAiThinking = useCallback(
      (roomId: string, isThinking: boolean) => {
        if (!aiActivityYMap) return;
        const state: AiThinkingState = {
          roomId,
          isThinking,
          timestamp: Date.now(),
        };
        aiActivityYMap.set(roomId, state);
      },
      [aiActivityYMap],
    );

    // ── Shared state actions ─────────────────────────────────────────
    const setSharedState = useCallback(
      (key: string, value: any) => {
        if (!sharedStateYMap) return;
        sharedStateYMap.set(key, value);
      },
      [sharedStateYMap],
    );

    const deleteSharedState = useCallback(
      (key: string) => {
        if (!sharedStateYMap) return;
        sharedStateYMap.delete(key);
      },
      [sharedStateYMap],
    );

    // ── Room data actions ────────────────────────────────────────────
    const setRoomData = useCallback(
      (roomId: string, key: string, value: any) => {
        if (!roomDataYMap) return;
        const existing = (roomDataYMap.get(roomId) as Record<string, any>) || {};
        roomDataYMap.set(roomId, { ...existing, [key]: value });
      },
      [roomDataYMap],
    );

    const deleteRoomData = useCallback(
      (roomId: string, key?: string) => {
        if (!roomDataYMap) return;
        if (key) {
          const existing = (roomDataYMap.get(roomId) as Record<string, any>) || {};
          const remaining = omit(existing, key);
          if (isEmpty(remaining)) {
            roomDataYMap.delete(roomId);
          } else {
            roomDataYMap.set(roomId, remaining);
          }
        } else {
          roomDataYMap.delete(roomId);
        }
      },
      [roomDataYMap],
    );

    // ── Proxy ref for stable callbacks ────────────────────────────────
    const actionsRef = useRef<SignalActions>({
      startTyping,
      stopTyping,
      switchRoom,
      setAiThinking,
      setSharedState,
      deleteSharedState,
      setRoomData,
      deleteRoomData,
    });
    actionsRef.current = {
      startTyping,
      stopTyping,
      switchRoom,
      setAiThinking,
      setSharedState,
      deleteSharedState,
      setRoomData,
      deleteRoomData,
    };

    useEffect(() => {
      const proxy: SignalActions = {
        startTyping: (...args) => actionsRef.current.startTyping(...args),
        stopTyping: () => actionsRef.current.stopTyping(),
        switchRoom: (...args) => actionsRef.current.switchRoom(...args),
        setAiThinking: (...args) => actionsRef.current.setAiThinking(...args),
        setSharedState: (...args) => actionsRef.current.setSharedState(...args),
        deleteSharedState: (...args) => actionsRef.current.deleteSharedState(...args),
        setRoomData: (...args) => actionsRef.current.setRoomData(...args),
        deleteRoomData: (...args) => actionsRef.current.deleteRoomData(...args),
      };
      compRef.current.children._signalActions.dispatchChangeValueAction(
        proxy as unknown as JSONObject,
      );
    }, []);

    // ── Set / restore presence on connect, reconnect, or peer changes ────
    // Announces presence when:
    // 1. Connection becomes ready (initial connect or reconnect)
    // 2. Peer count changes (new user joins or leaves) — re-announces to
    //    ensure peers that were still syncing receive our presence
    useEffect(() => {
      if (!ready) return;
      const roomId = compRef.current.children.currentRoomId.getView() as string | null;
      setMyPresence({
        userId,
        userName,
        currentRoomId: roomId,
        typing: false,
      } as any);
    }, [ready, others.length, setMyPresence, userId, userName]);

    return null;
  },
);

SignalController.displayName = "SignalController";

// ─── View function (wraps PluvRoomProvider) ──────────────────────────────────

const ChatControllerSignalBase = withViewFn(
  simpleMultiComp(childrenMap),
  (comp) => {
    const userId = comp.children.userId.getView().value;
    const userName = comp.children.userName.getView().value;
    const applicationId = comp.children.applicationId.getView().value;

    const roomName = `signal_${applicationId || "lowcoder_app"}`;

    return (
      <PluvRoomProvider
        room={roomName}
        metadata={{ userId: userId || "user_1", userName: userName || "User" } as any}
        initialPresence={
          {
            userId: userId || "user_1",
            userName: userName || "User",
            currentRoomId: null,
            typing: false,
          } as any
        }
        initialStorage={(t: any) => ({
          aiActivity: t.map("aiActivity", []),
          sharedState: t.map("sharedState", []),
          roomData: t.map("roomData", []),
        })}
        onAuthorizationFail={(error: Error) => {
          console.error("[ChatControllerV2] Auth failed:", error);
          comp.children.error.dispatchChangeValueAction(error.message);
          comp.children.onEvent.getView()("error");
        }}
      >
        <SignalController
          comp={comp}
          userId={userId || "user_1"}
          userName={userName || "User"}
        />
      </PluvRoomProvider>
    );
  },
);

// ─── Property panel ─────────────────────────────────────────────────────────

const ChatControllerSignalWithProps = withPropertyViewFn(
  ChatControllerSignalBase,
  (comp) => (
    <>
      <Section name={sectionNames.basic}>
        {comp.children.applicationId.propertyView({
          label: "Application ID",
          tooltip:
            "Scopes the signal room to this application. All users of the same app share presence and notifications.",
        })}
        {comp.children.userId.propertyView({
          label: "User ID",
          tooltip: "Current user's unique identifier",
        })}
        {comp.children.userName.propertyView({
          label: "User Name",
          tooltip: "Current user's display name",
        })}
      </Section>
      <Section name={sectionNames.interaction}>
        {comp.children.onEvent.getPropertyView()}
      </Section>
    </>
  ),
);

// ─── Expose state properties ────────────────────────────────────────────────

let ChatControllerSignal = withExposingConfigs(ChatControllerSignalWithProps, [
  new NameConfig("ready", "Whether the signal server is connected and ready"),
  new NameConfig("error", "Error message if connection failed"),
  new NameConfig(
    "connectionStatus",
    "Current connection status (Online / Connecting... / Offline)",
  ),
  new NameConfig(
    "onlineUsers",
    "Array of currently online users: [{ userId, userName, currentRoomId }]",
  ),
  new NameConfig(
    "typingUsers",
    "Array of users currently typing: [{ userId, userName, roomId }]",
  ),
  new NameConfig("currentRoomId", "Currently active room/channel ID"),
  new NameConfig("userId", "Current user ID"),
  new NameConfig("userName", "Current user name"),
  new NameConfig("applicationId", "Application scope ID"),
  new NameConfig(
    "aiThinkingRooms",
    "Map of roomId → boolean indicating which rooms have an AI currently thinking. E.g. { 'room_123': true }",
  ),
  new NameConfig(
    "sharedState",
    "App-level shared state (JSON) that auto-syncs across all connected users. Write with setSharedState(key, value).",
  ),
  new NameConfig(
    "roomData",
    "Room-scoped shared data (JSON) that auto-syncs. Structure: { roomId: { key: value } }. Not visible as chat messages. Write with setRoomData(roomId, key, value).",
  ),
]);

// ─── Expose methods ─────────────────────────────────────────────────────────

ChatControllerSignal = withMethodExposing(ChatControllerSignal, [
  {
    method: {
      name: "startTyping",
      description:
        "Signal that the current user started typing. Other users will see the typing indicator.",
      params: [{ name: "roomId", type: "string" }],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.startTyping) {
        actions.startTyping(values?.[0] as string | undefined);
      }
    },
  },
  {
    method: {
      name: "stopTyping",
      description: "Signal that the current user stopped typing",
      params: [],
    },
    execute: (comp) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.stopTyping) {
        actions.stopTyping();
      }
    },
  },
  {
    method: {
      name: "switchRoom",
      description:
        "Set the current room/channel context. Presence and typing will scope to this room.",
      params: [{ name: "roomId", type: "string" }],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.switchRoom) {
        actions.switchRoom(values?.[0] as string);
      }
    },
  },
  {
    method: {
      name: "setAiThinking",
      description:
        "Broadcast to all room members that the AI assistant is thinking (or has finished). All users in the room will see the thinking indicator.",
      params: [
        { name: "roomId", type: "string" },
        { name: "isThinking", type: "string" },
      ],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.setAiThinking) {
        const isThinking = values?.[1] === true || values?.[1] === "true";
        actions.setAiThinking(values?.[0] as string, isThinking);
      }
    },
  },
  {
    method: {
      name: "setSharedState",
      description:
        "Set a key-value pair in the app-level shared state. Auto-syncs to all connected users instantly via CRDT.",
      params: [
        { name: "key", type: "string" },
        { name: "value", type: "JSONValue" },
      ],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.setSharedState) {
        actions.setSharedState(values?.[0] as string, values?.[1]);
      }
    },
  },
  {
    method: {
      name: "deleteSharedState",
      description: "Delete a key from the app-level shared state.",
      params: [{ name: "key", type: "string" }],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.deleteSharedState) {
        actions.deleteSharedState(values?.[0] as string);
      }
    },
  },
  {
    method: {
      name: "setRoomData",
      description:
        "Set a key-value pair in a room's shared data. Auto-syncs to all connected users. Not visible as a chat message — use for real-time JSON data exchange within a room/channel.",
      params: [
        { name: "roomId", type: "string" },
        { name: "key", type: "string" },
        { name: "value", type: "JSONValue" },
      ],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.setRoomData) {
        actions.setRoomData(
          values?.[0] as string,
          values?.[1] as string,
          values?.[2],
        );
      }
    },
  },
  {
    method: {
      name: "deleteRoomData",
      description:
        "Delete a key from a room's shared data. If no key is provided, deletes all data for the room.",
      params: [
        { name: "roomId", type: "string" },
        { name: "key", type: "string" },
      ],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.deleteRoomData) {
        actions.deleteRoomData(
          values?.[0] as string,
          values?.[1] as string | undefined,
        );
      }
    },
  },
  {
    method: {
      name: "setUser",
      description: "Update the current user credentials",
      params: [
        { name: "userId", type: "string" },
        { name: "userName", type: "string" },
      ],
    },
    execute: (comp, values) => {
      if (values?.[0])
        comp.children.userId.getView().onChange(values[0] as string);
      if (values?.[1])
        comp.children.userName.getView().onChange(values[1] as string);
    },
  },
]);

export { ChatControllerSignal };
