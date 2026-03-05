import React, { useCallback } from "react";
import { Modal, Form, Input, Radio, Button, Space } from "antd";
import { PlusOutlined, GlobalOutlined, LockOutlined } from "@ant-design/icons";
import type { ChatRoom } from "../store";

export interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreateRoom: (name: string, type: "public" | "private", description?: string) => Promise<ChatRoom | null>;
  onRoomCreatedEvent: () => void;
}

export const CreateRoomModal = React.memo((props: CreateRoomModalProps) => {
  const { open, onClose, onCreateRoom, onRoomCreatedEvent } = props;
  const [form] = Form.useForm();

  const handleFinish = useCallback(
    async (values: { roomName: string; roomType: "public" | "private"; description?: string }) => {
      const room = await onCreateRoom(values.roomName.trim(), values.roomType, values.description);
      if (room) {
        form.resetFields();
        onClose();
        onRoomCreatedEvent();
      }
    },
    [onCreateRoom, form, onClose, onRoomCreatedEvent],
  );

  const handleCancel = useCallback(() => {
    onClose();
    form.resetFields();
  }, [onClose, form]);

  return (
    <Modal
      title="Create Room"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={420}
      centered
      destroyOnHidden
    >
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
          <Input placeholder="e.g. Design Team" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="What is this room about?" rows={2} />
        </Form.Item>
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
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Create
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
});

CreateRoomModal.displayName = "CreateRoomModal";
