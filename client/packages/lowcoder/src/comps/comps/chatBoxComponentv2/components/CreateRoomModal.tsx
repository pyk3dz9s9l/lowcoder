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
import { trans } from "i18n";

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
      title={trans("chatBoxV2.createRoomModalTitle")}
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
          {trans("chatBoxV2.roomTypeLabel")}
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
                  {trans("chatBoxV2.normalRoomLabel")}
                </div>
              ),
              value: "normal",
            },
            {
              label: (
                <div style={{ padding: "4px 0", color: roomMode === "llm" ? "#7c3aed" : undefined }}>
                  <RobotOutlined style={{ marginRight: 6 }} />
                  {trans("chatBoxV2.aiRoomLabel")}
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
              <strong>{trans("chatBoxV2.aiRoomStrongLabel")}</strong>{" "}
              {trans("chatBoxV2.aiRoomMessage")}
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
          label={trans("chatBoxV2.roomNameLabel")}
          rules={[
            { required: true, message: trans("chatBoxV2.roomNameRequired") },
            { min: 2, message: trans("chatBoxV2.roomNameMin") },
            { max: 50, message: trans("chatBoxV2.roomNameMax") },
          ]}
        >
          <Input
            placeholder={
              roomMode === "llm"
                ? trans("chatBoxV2.roomNamePlaceholderAi")
                : trans("chatBoxV2.roomNamePlaceholderNormal")
            }
          />
        </Form.Item>

        <Form.Item name="description" label={trans("chatBoxV2.descriptionLabel")}>
          <Input.TextArea placeholder={trans("chatBoxV2.descriptionPlaceholder")} rows={2} />
        </Form.Item>

        {roomMode === "normal" && (
          <Form.Item name="roomType" label={trans("chatBoxV2.visibilityLabel")}>
            <Radio.Group>
              <Radio value="public">
                <GlobalOutlined style={{ color: "#52c41a", marginRight: 4 }} /> {trans("chatBoxV2.publicRoomsLabel")}
              </Radio>
              <Radio value="private">
                <LockOutlined style={{ color: "#fa8c16", marginRight: 4 }} /> {trans("chatBoxV2.privateRoomsLabel")}
              </Radio>
            </Radio.Group>
          </Form.Item>
        )}

        {roomMode === "llm" && (
          <Form.Item
            name="llmQueryName"
            label={
              <span>
                {trans("chatBoxV2.queryNameLabel")}{" "}
                <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>
                  ({trans("chatBoxV2.queryNameHint")})
                </span>
              </span>
            }
            rules={[{ required: true, message: trans("chatBoxV2.queryNameRequired") }]}
            extra={
              <span style={{ fontSize: 12, color: "#888" }}>
                {trans("chatBoxV2.queryNameExtraPrefix")}{" "}
                <code style={{ fontSize: 11 }}>conversationHistory</code>,{" "}
                <code style={{ fontSize: 11 }}>prompt</code>, and{" "}
                <code style={{ fontSize: 11 }}>roomId</code> {trans("chatBoxV2.queryNameExtraSuffix")}
              </span>
            }
          >
            <Input
              placeholder={trans("chatBoxV2.queryNamePlaceholder")}
              prefix={<RobotOutlined style={{ color: "#c084fc" }} />}
            />
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>{trans("chatBoxV2.cancelAction")}</Button>
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
              {roomMode === "llm"
                ? trans("chatBoxV2.createAiRoomButton")
                : trans("chatBoxV2.createRoomButton")}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
});

CreateRoomModal.displayName = "CreateRoomModal";
