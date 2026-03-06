import { useState, useCallback, useMemo } from "react";
import ForeignKeyList from "./ForeignKeyList";
import ForeignKeyModal from "./ForeignKeyModal";
import { createForeignKey, deleteForeignKey, updateForeignKey } from "../../lib/api";
import type { GraphData, TableColumn } from "../../types";

interface ForeignKeyTabProps {
  schemaGraph: GraphData | null;
  onReload: () => Promise<void>;
}

interface ForeignKeyItem {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface TableInfo {
  id: string;
  label: string;
  columns: TableColumn[];
}

export default function ForeignKeyTab({ schemaGraph, onReload }: ForeignKeyTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingFK, setEditingFK] = useState<ForeignKeyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tables: TableInfo[] = useMemo(() => {
    if (!schemaGraph) return [];
    return schemaGraph.nodes.map((n) => {
      let columns: TableColumn[] = [];
      try {
        if (n.properties.columns) {
          columns = JSON.parse(String(n.properties.columns));
        }
      } catch {}
      return { id: n.id, label: n.label, columns };
    });
  }, [schemaGraph]);

  const foreignKeys: ForeignKeyItem[] = useMemo(() => {
    if (!schemaGraph) return [];
    return schemaGraph.edges
      .filter((e) => e.type === "FOREIGN_KEY")
      .map((e) => ({
        fromTable: e.source,
        fromColumn: (e.properties.fromColumn as string) || "",
        toTable: e.target,
        toColumn: (e.properties.toColumn as string) || "",
      }));
  }, [schemaGraph]);

  const handleCreate = useCallback(() => {
    setModalMode("create");
    setEditingFK(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((fk: ForeignKeyItem) => {
    setModalMode("edit");
    setEditingFK(fk);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (fk: ForeignKeyItem) => {
    if (!confirm(`Delete foreign key ${fk.fromTable}.${fk.fromColumn} -> ${fk.toTable}.${fk.toColumn}?`)) return;
    setDeleting(true);
    try {
      await deleteForeignKey(fk.fromTable, fk.toTable, fk.fromColumn, fk.toColumn);
      await onReload();
    } catch (err) {
      console.error("Failed to delete foreign key:", err);
      alert("Failed to delete foreign key");
    } finally {
      setDeleting(false);
    }
  }, [onReload]);

  const handleSave = useCallback(async (data: ForeignKeyItem) => {
    if (modalMode === "create") {
      await createForeignKey({
        fromTable: data.fromTable,
        fromColumn: data.fromColumn,
        toTable: data.toTable,
        toColumn: data.toColumn,
      });
    } else if (editingFK) {
      await updateForeignKey({
        oldFromTable: editingFK.fromTable,
        oldFromColumn: editingFK.fromColumn,
        oldToTable: editingFK.toTable,
        oldToColumn: editingFK.toColumn,
        newFromTable: data.fromTable,
        newFromColumn: data.fromColumn,
        newToTable: data.toTable,
        newToColumn: data.toColumn,
      });
    }
    setShowModal(false);
    setEditingFK(null);
    await onReload();
  }, [modalMode, editingFK, onReload]);

  return (
    <div className="flex-1 overflow-auto p-1">
      <div className="max-w mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Foreign Keys</h3>
            <p className="text-sm text-muted mt-1">
              Manage foreign key relationships between tables
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={tables.length < 1}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium"
          >
            + Add Foreign Key
          </button>
        </div>

        <ForeignKeyList
          foreignKeys={foreignKeys}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deleting={deleting}
        />
      </div>

      {showModal && (
        <ForeignKeyModal
          mode={modalMode}
          tables={tables}
          initialData={editingFK || undefined}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingFK(null);
          }}
        />
      )}
    </div>
  );
}
