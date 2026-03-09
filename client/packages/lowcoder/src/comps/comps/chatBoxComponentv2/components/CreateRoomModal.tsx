import React, { useCallback, useState } from "react";
import { Modal, Form, Input, Radio, Button, Space, Alert, Segmented } from "antd";
import {
  PlusOutlined,
  GlobalOutlined,
  LockOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { ChatRoom } from "../store";

export interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreateRoom: (
    name: string,
    type: "public" | "private" | "llm",
    description?: string,
    llmQueryName?: string,
  ) => Promise<ChatRoom | null>;
  onRoomCreatedEvent: () => void;
}

type RoomMode = "normal" | "llm";

export const CreateRoomModal = React.memo((props: CreateRoomModalProps) => {
  const { open, onClose, onCreateRoom, onRoomCreatedEvent } = props;
  const [form] = Form.useForm();
  const [roomMode, setRoomMode] = useState<RoomMode>("normal");

  const handleModeChange = useCallback((val: string | number) => {
    setRoomMode(val as RoomMode);
    // Reset visibility when switching modes
    form.setFieldValue("roomType", val === "llm" ? "llm" : "public");
  }, [form]);

  const handleFinish = useCallback(
    async (values: {
      roomName: string;
      roomType: "public" | "private" | "llm";
      description?: string;
      llmQueryName?: string;
    }) => {
      const type: "public" | "private" | "llm" =
        roomMode === "llm" ? "llm" : values.roomType;

      const room = await onCreateRoom(
        values.roomName.trim(),
        type,
        values.description,
        roomMode === "llm" ? values.llmQueryName?.trim() : undefined,
      );

      if (room) {
        form.resetFields();
        setRoomMode("normal");
        onClose();
        onRoomCreatedEvent();
      }
    },
    [onCreateRoom, form, onClose, onRoomCreatedEvent, roomMode],
  );

  const handleCancel = useCallback(() => {
    onClose();
    form.resetFields();
    setRoomMode("normal");
  }, [onClose, form]);

  return (
    <Modal
      title="Create Room"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={460}
      centered
      destroyOnHidden
    >
      {/* Room mode selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 500 }}>
          ROOM TYPE
        </div>
        <Segmented
          block
          value={roomMode}
          onChange={handleModeChange}
          options={[
            {
              label: (
                <div style={{ padding: "4px 0" }}>
                  <GlobalOutlined style={{ marginRight: 6 }} />
                  Normal Room
                </div>
              ),
              value: "normal",
            },
            {
              label: (
                <div style={{ padding: "4px 0", color: roomMode === "llm" ? "#7c3aed" : undefined }}>
                  <RobotOutlined style={{ marginRight: 6 }} />
                  AI / LLM Room
                </div>
              ),
              value: "llm",
            },
          ]}
        />
      </div>

      {roomMode === "llm" && (
        <Alert
          type="info"
          showIcon
          icon={<ThunderboltOutlined style={{ color: "#7c3aed" }} />}
          style={{
            marginBottom: 16,
            background: "#faf5ff",
            border: "1px solid #e9d5ff",
            borderRadius: 8,
          }}
          message={
            <span style={{ fontSize: 13, color: "#5b21b6" }}>
              <strong>AI Room</strong> — every user message triggers your Lowcoder query.
              The AI response is broadcast to all members in real time.
            </span>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ roomType: "public" }}
      >
        <Form.Item
          name="roomName"
          label="Room Name"
          rules={[
            { required: true, message: "Room name is required" },
            { min: 2, message: "At least 2 characters" },
            { max: 50, message: "At most 50 characters" },
          ]}
        >
          <Input placeholder={roomMode === "llm" ? "e.g. GPT-4 Assistant" : "e.g. Design Team"} />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="What is this room about?" rows={2} />
        </Form.Item>

        {roomMode === "normal" && (
          <Form.Item name="roomType" label="Visibility">
            <Radio.Group>
              <Radio value="public">
                <GlobalOutlined style={{ color: "#52c41a", marginRight: 4 }} /> Public
              </Radio>
              <Radio value="private">
                <LockOutlined style={{ color: "#fa8c16", marginRight: 4 }} /> Private
              </Radio>
            </Radio.Group>
          </Form.Item>
        )}

        {roomMode === "llm" && (
          <Form.Item
            name="llmQueryName"
            label={
              <span>
                Query Name{" "}
                <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>
                  (name of your Lowcoder query)
                </span>
              </span>
            }
            rules={[{ required: true, message: "A query name is required for AI rooms" }]}
            extra={
              <span style={{ fontSize: 12, color: "#888" }}>
                Create a query in the bottom panel of Lowcoder and enter its exact name here.
                Your query will receive{" "}
                <code style={{ fontSize: 11 }}>conversationHistory</code>,{" "}
                <code style={{ fontSize: 11 }}>prompt</code>, and{" "}
                <code style={{ fontSize: 11 }}>roomId</code> as arguments.
              </span>
            }
          >
            <Input
              placeholder="e.g. getAIResponse"
              prefix={<RobotOutlined style={{ color: "#c084fc" }} />}
            />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={roomMode === "llm" ? <RobotOutlined /> : <PlusOutlined />}
              style={
                roomMode === "llm"
                  ? { background: "#7c3aed", borderColor: "#7c3aed" }
                  : undefined
              }
            >
              Create {roomMode === "llm" ? "AI Room" : "Room"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
});

CreateRoomModal.displayName = "CreateRoomModal";
