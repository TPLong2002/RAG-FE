import { useState, useEffect, useMemo } from "react";
import type { TableColumn } from "../../types";

interface TableInfo {
  id: string;
  label: string;
  columns: TableColumn[];
}

interface ForeignKeyData {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface ForeignKeyModalProps {
  mode: "create" | "edit";
  tables: TableInfo[];
  initialData?: ForeignKeyData;
  onSave: (data: ForeignKeyData) => Promise<void>;
  onClose: () => void;
}

export default function ForeignKeyModal({ mode, tables, initialData, onSave, onClose }: ForeignKeyModalProps) {
  const [fromTable, setFromTable] = useState(initialData?.fromTable || "");
  const [fromColumn, setFromColumn] = useState(initialData?.fromColumn || "");
  const [toTable, setToTable] = useState(initialData?.toTable || "");
  const [toColumn, setToColumn] = useState(initialData?.toColumn || "");
  const [saving, setSaving] = useState(false);

  const fromColumns = useMemo(() => {
    const table = tables.find((t) => t.id === fromTable);
    return table?.columns || [];
  }, [tables, fromTable]);

  const toColumns = useMemo(() => {
    const table = tables.find((t) => t.id === toTable);
    return table?.columns || [];
  }, [tables, toTable]);

  // Reset column when table changes
  useEffect(() => {
    if (!initialData || fromTable !== initialData.fromTable) {
      setFromColumn("");
    }
  }, [fromTable, initialData]);

  useEffect(() => {
    if (!initialData || toTable !== initialData.toTable) {
      setToColumn("");
    }
  }, [toTable, initialData]);

  const canSave = fromTable && fromColumn && toTable && toColumn;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ fromTable, fromColumn, toTable, toColumn });
    } catch {
      alert(`Failed to ${mode} foreign key`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-lg p-6 w-[480px] shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-6">
          {mode === "create" ? "Create Foreign Key" : "Edit Foreign Key"}
        </h3>

        <div className="space-y-5">
          {/* From section */}
          <div className="p-4 bg-accent rounded-lg border border-border">
            <div className="text-xs font-medium uppercase text-muted mb-3">Source</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted block mb-1">Table</label>
                <select
                  value={fromTable}
                  onChange={(e) => setFromTable(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                >
                  <option value="">Select table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Column</label>
                <select
                  value={fromColumn}
                  onChange={(e) => setFromColumn(e.target.value)}
                  disabled={!fromTable}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm disabled:opacity-50"
                >
                  <option value="">Select column...</option>
                  {fromColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type}){col.isPrimaryKey ? " PK" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-muted text-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>

          {/* To section */}
          <div className="p-4 bg-accent rounded-lg border border-border">
            <div className="text-xs font-medium uppercase text-muted mb-3">Target</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted block mb-1">Table</label>
                <select
                  value={toTable}
                  onChange={(e) => setToTable(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                >
                  <option value="">Select table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Column</label>
                <select
                  value={toColumn}
                  onChange={(e) => setToColumn(e.target.value)}
                  disabled={!toTable}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm disabled:opacity-50"
                >
                  <option value="">Select column...</option>
                  {toColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type}){col.isPrimaryKey ? " PK" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {fromTable && toTable && fromTable === toTable && (
            <div className="text-xs text-amber-400">Self-reference foreign key will be created on the same table.</div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface border border-border rounded text-sm hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded text-sm font-medium"
          >
            {saving ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
