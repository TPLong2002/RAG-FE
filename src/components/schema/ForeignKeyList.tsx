import { useState } from "react";

interface ForeignKeyItem {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

interface ForeignKeyListProps {
  foreignKeys: ForeignKeyItem[];
  onEdit: (fk: ForeignKeyItem) => void;
  onDelete: (fk: ForeignKeyItem) => void;
  deleting: boolean;
}

export default function ForeignKeyList({ foreignKeys, onEdit, onDelete, deleting }: ForeignKeyListProps) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? foreignKeys.filter(
        (fk) =>
          fk.fromTable.toLowerCase().includes(filter.toLowerCase()) ||
          fk.toTable.toLowerCase().includes(filter.toLowerCase()) ||
          fk.fromColumn.toLowerCase().includes(filter.toLowerCase()) ||
          fk.toColumn.toLowerCase().includes(filter.toLowerCase())
      )
    : foreignKeys;

  if (foreignKeys.length === 0) {
    return (
      <div className="text-sm text-muted text-center py-8">
        No foreign keys defined. Click "Add Foreign Key" to create one.
      </div>
    );
  }

  return (
    <div>
      {foreignKeys.length > 5 && (
        <div className="mb-3">
          <input
            type="text"
            placeholder="Filter by table or column name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
          />
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[18%]" />
            <col className="w-[4%]" />
            <col className="w-[25%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="bg-accent text-muted text-xs uppercase">
              <th className="text-left px-3 py-2">Source Table</th>
              <th className="text-left px-3 py-2">Column</th>
              <th className="px-1 py-2"></th>
              <th className="text-left px-3 py-2">Target Table</th>
              <th className="text-left px-3 py-2">Column</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((fk, i) => (
              <tr
                key={`${fk.fromTable}-${fk.fromColumn}-${fk.toTable}-${fk.toColumn}`}
                className={`border-t border-border hover:bg-surface-hover ${i % 2 === 0 ? "" : "bg-accent/30"}`}
              >
                <td className="px-3 py-2 font-medium truncate" title={fk.fromTable}>{fk.fromTable}</td>
                <td className="px-3 py-2 font-mono text-xs truncate" title={fk.fromColumn}>{fk.fromColumn}</td>
                <td className="px-1 py-2 text-muted text-center">&rarr;</td>
                <td className="px-3 py-2 font-medium truncate" title={fk.toTable}>{fk.toTable}</td>
                <td className="px-3 py-2 font-mono text-xs truncate" title={fk.toColumn}>{fk.toColumn}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(fk)}
                      className="p-1 rounded hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(fk)}
                      disabled={deleting}
                      className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted mt-2">
        {filtered.length === foreignKeys.length
          ? `${foreignKeys.length} foreign key${foreignKeys.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${foreignKeys.length} shown`}
      </div>
    </div>
  );
}
