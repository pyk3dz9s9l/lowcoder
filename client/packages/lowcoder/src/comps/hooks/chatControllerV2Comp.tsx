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
import {
  PluvRoomProvider,
  useStorage,
  useMyPresence,
  useOthers,
  useConnection,
} from "../comps/chatBoxComponentv2/store";
import type {
  AiThinkingState,
  MessageBroadcast,
  OnlineUser,
  TypingUser,
} from "../comps/chatBoxComponentv2/store";

// ─── Event definitions ──────────────────────────────────────────────────────

const ChatControllerEvents = [
  {
    label: "New Message Broadcast",
    value: "newMessageBroadcast",
    description: "A peer broadcast that a new message was saved — reload your data query to fetch it",
  },
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
  lastMessageNotification: stateComp<JSONObject | null>(null),
  aiThinkingRooms: stateComp<JSONObject>({}),

  _signalActions: stateComp<JSONObject>({}),
};

// ─── Signal actions interface ────────────────────────────────────────────────

interface SignalActions {
  broadcastNewMessage: (roomId: string, messageId?: string) => void;
  startTyping: (roomId?: string) => void;
  stopTyping: () => void;
  switchRoom: (roomId: string) => void;
  setAiThinking: (roomId: string, isThinking: boolean) => void;
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
    const [messageActivity, messageActivityYMap] = useStorage("messageActivity");
    const [aiActivity, aiActivityYMap] = useStorage("aiActivity");

    const compRef = useRef(comp);
    compRef.current = comp;

    const triggerEvent = comp.children.onEvent.getView();
    const triggerEventRef = useRef(triggerEvent);
    triggerEventRef.current = triggerEvent;

    const prevRef = useRef<{
      ready: boolean;
      onlineCount: number;
      lastBroadcastCounter: Record<string, number>;
      initialized: boolean;
      aiThinkingRooms: Record<string, boolean>;
    }>({
      ready: false,
      onlineCount: 0,
      lastBroadcastCounter: {},
      initialized: false,
      aiThinkingRooms: {},
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
      return others
        .filter((o: any) => o.presence != null)
        .map((o: any) => ({
          userId: o.presence.userId as string,
          userName: o.presence.userName as string,
          currentRoomId: (o.presence.currentRoomId as string) || null,
        }));
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

    // ── Watch message activity for broadcasts from other users ────────
    useEffect(() => {
      if (!messageActivity) return;
      const activityRecord = messageActivity as Record<string, MessageBroadcast>;

      for (const [roomId, activity] of Object.entries(activityRecord)) {
        const prevCounter =
          prevRef.current.lastBroadcastCounter[roomId] || 0;
        if (activity.counter > prevCounter) {
          prevRef.current.lastBroadcastCounter[roomId] = activity.counter;
          if (activity.authorId !== userId) {
            compRef.current.children.lastMessageNotification.dispatchChangeValueAction(
              activity as unknown as JSONObject,
            );
            triggerEventRef.current("newMessageBroadcast");
          }
        }
      }
    }, [messageActivity, userId]);

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

    // ── Actions for method invocation ─────────────────────────────────

    const broadcastNewMessage = useCallback(
      (roomId: string, messageId?: string) => {
        if (!messageActivityYMap) return;
        const existing = messageActivityYMap.get(roomId) as
          | MessageBroadcast
          | undefined;
        const broadcast: MessageBroadcast = {
          roomId,
          messageId: messageId || crypto.randomUUID(),
          authorId: userId,
          authorName: userName,
          timestamp: Date.now(),
          counter: (existing?.counter || 0) + 1,
        };
        messageActivityYMap.set(roomId, broadcast);
        prevRef.current.lastBroadcastCounter[roomId] = broadcast.counter;
      },
      [messageActivityYMap, userId, userName],
    );

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

    // ── Proxy ref for stable callbacks ────────────────────────────────
    const actionsRef = useRef<SignalActions>({
      broadcastNewMessage,
      startTyping,
      stopTyping,
      switchRoom,
      setAiThinking,
    });
    actionsRef.current = {
      broadcastNewMessage,
      startTyping,
      stopTyping,
      switchRoom,
      setAiThinking,
    };

    useEffect(() => {
      const proxy: SignalActions = {
        broadcastNewMessage: (...args) => actionsRef.current.broadcastNewMessage(...args),
        startTyping: (...args) => actionsRef.current.startTyping(...args),
        stopTyping: () => actionsRef.current.stopTyping(),
        switchRoom: (...args) => actionsRef.current.switchRoom(...args),
        setAiThinking: (...args) => actionsRef.current.setAiThinking(...args),
      };
      compRef.current.children._signalActions.dispatchChangeValueAction(
        proxy as unknown as JSONObject,
      );
    }, []);

    // ── Set initial presence ──────────────────────────────────────────
    useEffect(() => {
      setMyPresence({
        userId,
        userName,
        currentRoomId: null,
        typing: false,
      } as any);
    }, [setMyPresence, userId, userName]);

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
          messageActivity: t.map("messageActivity", []),
          aiActivity: t.map("aiActivity", []),
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
  new NameConfig(
    "lastMessageNotification",
    "Last message broadcast received from a peer: { roomId, messageId, authorId, authorName, timestamp }",
  ),
  new NameConfig("userId", "Current user ID"),
  new NameConfig("userName", "Current user name"),
  new NameConfig("applicationId", "Application scope ID"),
  new NameConfig(
    "aiThinkingRooms",
    "Map of roomId → boolean indicating which rooms have an AI currently thinking. E.g. { 'room_123': true }",
  ),
]);

// ─── Expose methods ─────────────────────────────────────────────────────────

ChatControllerSignal = withMethodExposing(ChatControllerSignal, [
  {
    method: {
      name: "broadcastNewMessage",
      description:
        "Broadcast to all peers that a new message was saved. Other users' onNewMessageBroadcast event fires so they can reload their data query.",
      params: [
        { name: "roomId", type: "string" },
        { name: "messageId", type: "string" },
      ],
    },
    execute: (comp, values) => {
      const actions = comp.children._signalActions.getView() as unknown as SignalActions;
      if (actions?.broadcastNewMessage) {
        actions.broadcastNewMessage(
          values?.[0] as string,
          values?.[1] as string | undefined,
        );
      }
    },
  },
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
