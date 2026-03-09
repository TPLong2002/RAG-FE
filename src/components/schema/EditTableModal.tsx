import { useState, useEffect } from "react";
import { Modal, Form, Input, Table, Tag } from "antd";
import type { TableColumn } from "../../types";

interface EditTableModalProps {
  open: boolean;
  tableName: string;
  initialDisplayName: string;
  initialDescription: string;
  initialColumns: TableColumn[];
  onSave: (data: { displayName: string; description: string; columns: TableColumn[] }) => Promise<void>;
  onCancel: () => void;
}

export default function EditTableModal({
  open,
  tableName,
  initialDisplayName,
  initialDescription,
  initialColumns,
  onSave,
  onCancel,
}: EditTableModalProps) {
  const [form] = Form.useForm();
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        displayName: initialDisplayName,
        description: initialDescription,
      });
      setColumns(initialColumns);
    }
  }, [open, initialDisplayName, initialDescription, initialColumns, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await onSave({
        displayName: values.displayName,
        description: values.description,
        columns,
      });
    } catch {
      // validation failed
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = [
    {
      title: "Column",
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (name: string, record: TableColumn) => (
        <span className="font-mono text-sm">
          {record.isPrimaryKey && <Tag color="gold" className="mr-1">PK</Tag>}
          {name}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type: string) => <span className="text-muted text-xs">{type}</span>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (_: string, record: TableColumn, index: number) => (
        <Input
          size="small"
          placeholder="Column description..."
          value={record.description || ""}
          onChange={(e) => {
            const newColumns = [...columns];
            newColumns[index] = { ...record, description: e.target.value };
            setColumns(newColumns);
          }}
        />
      ),
    },
  ];

  return (
    <Modal
      title={`Edit Table: ${tableName}`}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Save Changes"
      confirmLoading={saving}
      width={900}
      destroyOnClose
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="displayName"
          label="Display Name"
          rules={[{ required: true, message: "Display name is required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Table Description">
          <Input.TextArea rows={5} />
        </Form.Item>
      </Form>

      <div className="mb-2 text-sm font-medium">Columns</div>
      <Table
        dataSource={columns}
        columns={tableColumns}
        rowKey="name"
        size="small"
        pagination={false}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
}
