import React, { useEffect, useRef } from "react";
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
import { StringControl } from "comps/controls/codeControl";
import { eventHandlerControl } from "comps/controls/eventHandlerControl";
import { JSONObject } from "../../util/jsonTypes";
import { useChatStore, UseChatStoreReturn } from "../comps/chatBoxComponentv2/useChatStore";

// ─── Event definitions ──────────────────────────────────────────────────────

const ChatControllerEvents = [
  { label: "Message Sent", value: "messageSent", description: "Triggered when the current user sends a message" },
  { label: "Message Received", value: "messageReceived", description: "Triggered when a message is received from another user" },
  { label: "Room Joined", value: "roomJoined", description: "Triggered when the user joins a room" },
  { label: "Room Left", value: "roomLeft", description: "Triggered when the user leaves a room" },
  { label: "Connected", value: "connected", description: "Triggered when the chat store is ready" },
  { label: "Error", value: "error", description: "Triggered when an error occurs" },
] as const;

// ─── Children map ───────────────────────────────────────────────────────────

const childrenMap = {
  // Configuration (shown in property panel, readable & writable)
  applicationId: stringExposingStateControl("applicationId", "lowcoder_app"),
  userId: stringExposingStateControl("userId", "user_1"),
  userName: stringExposingStateControl("userName", "User"),
  defaultRoom: withDefault(StringControl, "general"),
  wsUrl: withDefault(StringControl, "ws://localhost:3005"),

  // Events
  onEvent: eventHandlerControl(ChatControllerEvents),

  // Reactive state (synced from useChatStore, exposed to users)
  ready: stateComp<boolean>(false),
  error: stateComp<string | null>(null),
  connectionStatus: stateComp<string>("Connecting..."),
  currentRoom: stateComp<JSONObject | null>(null),
  messages: stateComp<JSONObject[]>([]),
  userRooms: stateComp<JSONObject[]>([]),
  currentRoomMembers: stateComp<JSONObject[]>([]),
  typingUsers: stateComp<JSONObject[]>([]),

  // Internal: holds useChatStore actions so withMethodExposing can call them
  _chatActions: stateComp<JSONObject>({}),
};

// ─── View function (headless — returns null) ────────────────────────────────

const ChatControllerV2Base = withViewFn(
  simpleMultiComp(childrenMap),
  (comp) => {
    const userId = comp.children.userId.getView().value;
    const userName = comp.children.userName.getView().value;
    const applicationId = comp.children.applicationId.getView().value;
    const defaultRoom = comp.children.defaultRoom.getView();
    const wsUrl = comp.children.wsUrl.getView();

    const chat = useChatStore({
      applicationId: applicationId || "lowcoder_app",
      defaultRoom: defaultRoom || "general",
      userId: userId || "user_1",
      userName: userName || "User",
      wsUrl: wsUrl || "ws://localhost:3005",
    });

    const prevRef = useRef<{
      ready: boolean;
      msgCount: number;
      roomId: string | null;
    }>({ ready: false, msgCount: 0, roomId: null });

    const triggerEvent = comp.children.onEvent.getView();

    // ── Sync ready ─────────────────────────────────────────────────────
    useEffect(() => {
      comp.children.ready.dispatchChangeValueAction(chat.ready);
      if (chat.ready && !prevRef.current.ready) {
        triggerEvent("connected");
      }
      prevRef.current.ready = chat.ready;
    }, [chat.ready]);

    // ── Sync error ─────────────────────────────────────────────────────
    useEffect(() => {
      comp.children.error.dispatchChangeValueAction(chat.error);
      if (chat.error) {
        triggerEvent("error");
      }
    }, [chat.error]);

    // ── Sync connection status ─────────────────────────────────────────
    useEffect(() => {
      comp.children.connectionStatus.dispatchChangeValueAction(chat.connectionLabel);
    }, [chat.connectionLabel]);

    // ── Sync currentRoom ───────────────────────────────────────────────
    useEffect(() => {
      comp.children.currentRoom.dispatchChangeValueAction(
        chat.currentRoom as unknown as JSONObject | null,
      );
      const newRoomId = chat.currentRoom?.id ?? null;
      if (newRoomId && newRoomId !== prevRef.current.roomId) {
        triggerEvent("roomJoined");
      }
      prevRef.current.roomId = newRoomId;
    }, [chat.currentRoom]);

    // ── Sync messages ──────────────────────────────────────────────────
    useEffect(() => {
      comp.children.messages.dispatchChangeValueAction(
        chat.messages as unknown as JSONObject[],
      );
      const newCount = chat.messages.length;
      if (newCount > prevRef.current.msgCount && prevRef.current.msgCount > 0) {
        const lastMsg = chat.messages[newCount - 1];
        if (lastMsg?.authorId === userId) {
          triggerEvent("messageSent");
        } else {
          triggerEvent("messageReceived");
        }
      }
      prevRef.current.msgCount = newCount;
    }, [chat.messages, userId]);

    // ── Sync userRooms ─────────────────────────────────────────────────
    useEffect(() => {
      comp.children.userRooms.dispatchChangeValueAction(
        chat.userRooms as unknown as JSONObject[],
      );
    }, [chat.userRooms]);

    // ── Sync currentRoomMembers ────────────────────────────────────────
    useEffect(() => {
      comp.children.currentRoomMembers.dispatchChangeValueAction(
        chat.currentRoomMembers as unknown as JSONObject[],
      );
    }, [chat.currentRoomMembers]);

    // ── Sync typingUsers ───────────────────────────────────────────────
    useEffect(() => {
      comp.children.typingUsers.dispatchChangeValueAction(
        chat.typingUsers as unknown as JSONObject[],
      );
    }, [chat.typingUsers]);

    // ── Store actions for method access ────────────────────────────────
    useEffect(() => {
      comp.children._chatActions.dispatchChangeValueAction(
        chat as unknown as JSONObject,
      );
    }, [chat.ready, chat.currentRoom]);

    return null;
  },
);

// ─── Property panel ─────────────────────────────────────────────────────────

const ChatControllerV2WithProps = withPropertyViewFn(ChatControllerV2Base, (comp) => (
  <>
    <Section name={sectionNames.basic}>
      {comp.children.applicationId.propertyView({
        label: "Application ID",
        tooltip: "Scopes chat rooms to this application",
      })}
      {comp.children.userId.propertyView({
        label: "User ID",
        tooltip: "Current user's unique identifier",
      })}
      {comp.children.userName.propertyView({
        label: "User Name",
        tooltip: "Current user's display name",
      })}
      {comp.children.defaultRoom.propertyView({
        label: "Default Room",
        tooltip: "Room to auto-join on initialization",
      })}
      {comp.children.wsUrl.propertyView({
        label: "WebSocket URL",
        tooltip: "Yjs WebSocket server URL for real-time sync",
      })}
    </Section>
    <Section name={sectionNames.interaction}>
      {comp.children.onEvent.getPropertyView()}
    </Section>
  </>
));

// ─── Expose state properties ────────────────────────────────────────────────

let ChatControllerV2Comp = withExposingConfigs(ChatControllerV2WithProps, [
  new NameConfig("ready", "Whether the chat store is initialized and ready"),
  new NameConfig("error", "Error message if initialization failed"),
  new NameConfig("connectionStatus", "Current connection status label"),
  new NameConfig("currentRoom", "Currently active chat room object"),
  new NameConfig("messages", "Messages in the current room"),
  new NameConfig("userRooms", "Rooms the current user has joined"),
  new NameConfig("currentRoomMembers", "Members of the current room"),
  new NameConfig("typingUsers", "Users currently typing in the current room"),
  new NameConfig("userId", "Current user ID"),
  new NameConfig("userName", "Current user name"),
  new NameConfig("applicationId", "Application scope ID"),
]);

// ─── Expose methods ─────────────────────────────────────────────────────────

ChatControllerV2Comp = withMethodExposing(ChatControllerV2Comp, [
  {
    method: {
      name: "sendMessage",
      description: "Send a message to the current room",
      params: [{ name: "text", type: "string" }],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.sendMessage) {
        return await actions.sendMessage(values?.[0] as string);
      }
      return false;
    },
  },
  {
    method: {
      name: "switchRoom",
      description: "Switch to a different room by its ID",
      params: [{ name: "roomId", type: "string" }],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.switchRoom) {
        await actions.switchRoom(values?.[0] as string);
      }
    },
  },
  {
    method: {
      name: "createRoom",
      description: "Create a new chat room",
      params: [
        { name: "name", type: "string" },
        { name: "type", type: "string" },
        { name: "description", type: "string" },
      ],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.createRoom) {
        return await actions.createRoom(
          values?.[0] as string,
          (values?.[1] as "public" | "private") || "public",
          values?.[2] as string | undefined,
        );
      }
      return null;
    },
  },
  {
    method: {
      name: "joinRoom",
      description: "Join a room by its ID",
      params: [{ name: "roomId", type: "string" }],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.joinRoom) {
        return await actions.joinRoom(values?.[0] as string);
      }
      return false;
    },
  },
  {
    method: {
      name: "leaveRoom",
      description: "Leave a room by its ID",
      params: [{ name: "roomId", type: "string" }],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.leaveRoom) {
        const ok = await actions.leaveRoom(values?.[0] as string);
        if (ok) {
          comp.children.onEvent.getView()("roomLeft");
        }
        return ok;
      }
      return false;
    },
  },
  {
    method: {
      name: "searchRooms",
      description: "Search for public rooms by query string",
      params: [{ name: "query", type: "string" }],
    },
    execute: async (comp, values) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.searchRooms) {
        return await actions.searchRooms(values?.[0] as string);
      }
      return [];
    },
  },
  {
    method: {
      name: "startTyping",
      description: "Signal that the current user started typing",
      params: [],
    },
    execute: (comp) => {
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.startTyping) {
        actions.startTyping();
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
      const actions = comp.children._chatActions.getView() as unknown as UseChatStoreReturn;
      if (actions?.stopTyping) {
        actions.stopTyping();
      }
    },
  },
  {
    method: {
      name: "setUser",
      description: "Update the current chat user credentials",
      params: [
        { name: "userId", type: "string" },
        { name: "userName", type: "string" },
      ],
    },
    execute: (comp, values) => {
      if (values?.[0]) comp.children.userId.getView().onChange(values[0] as string);
      if (values?.[1]) comp.children.userName.getView().onChange(values[1] as string);
    },
  },
]);

export { ChatControllerV2Comp };
