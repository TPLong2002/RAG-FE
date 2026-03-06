import { useEffect, useState, useCallback } from "react";
import { fetchSchemaComparison, importTables, syncTables, deleteSchemaTable, createForeignKey } from "../lib/api";
import type { SchemaComparison } from "../types";

export default function ImportPage() {
  const [comparison, setComparison] = useState<SchemaComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedSyncTables, setSelectedSyncTables] = useState<Set<string>>(new Set());
  const [selectedMssqlFks, setSelectedMssqlFks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchemaComparison();
      setComparison(data);
      setSelectedTables(new Set());
    } catch (err) {
      console.error("Failed to load schema comparison:", err);
      alert("Failed to load schema comparison. Make sure MSSQL is configured.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const handleImportTables = useCallback(async () => {
    if (selectedTables.size === 0) return;
    setImporting(true);
    try {
      const result = await importTables(Array.from(selectedTables));
      alert(`Imported ${result.imported} tables successfully${result.errors.length > 0 ? `. Errors: ${result.errors.join(", ")}` : ""}`);
      await loadComparison();
    } catch (err) {
      console.error("Failed to import tables:", err);
      alert("Failed to import tables");
    } finally {
      setImporting(false);
    }
  }, [selectedTables, loadComparison]);

  const handleSyncTables = useCallback(async () => {
    if (selectedSyncTables.size === 0) return;
    setSyncing(true);
    try {
      const result = await syncTables(Array.from(selectedSyncTables));
      alert(`Synced ${result.synced} tables successfully${result.errors.length > 0 ? `. Errors: ${result.errors.join(", ")}` : ""}`);
      setSelectedSyncTables(new Set());
      await loadComparison();
    } catch (err) {
      console.error("Failed to sync tables:", err);
      alert("Failed to sync tables");
    } finally {
      setSyncing(false);
    }
  }, [selectedSyncTables, loadComparison]);

  const handleImportMssqlFks = useCallback(async () => {
    if (!comparison || selectedMssqlFks.size === 0) return;
    let created = 0;
    for (const key of selectedMssqlFks) {
      const fk = comparison.mssqlForeignKeys.find(
        (f) => `${f.fromTable}.${f.fromColumn}->${f.toTable}.${f.toColumn}` === key
      );
      if (!fk) continue;
      try {
        await createForeignKey({
          fromTable: fk.fromTable,
          fromColumn: fk.fromColumn,
          toTable: fk.toTable,
          toColumn: fk.toColumn,
        });
        created++;
      } catch (err) {
        console.error(`Failed to create FK ${key}:`, err);
      }
    }
    alert(`Created ${created} foreign key(s)`);
    setSelectedMssqlFks(new Set());
    await loadComparison();
  }, [comparison, selectedMssqlFks, loadComparison]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h3 className="text-lg font-semibold mb-4">Import MSSQL Tables</h3>
        {comparison ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2 text-emerald-400">New Tables (from MSSQL)</h4>
              <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
                {comparison.newTables.length === 0 ? (
                  <div className="text-sm text-muted">All tables already imported</div>
                ) : (
                  comparison.newTables.map((table) => (
                    <label key={table.name} className="flex items-start gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTables.has(table.name)}
                        onChange={(e) => {
                          const newSet = new Set(selectedTables);
                          if (e.target.checked) newSet.add(table.name);
                          else newSet.delete(table.name);
                          setSelectedTables(newSet);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{table.displayName}</div>
                        <div className="text-xs text-muted">{table.columns.length} columns</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 text-blue-400">Existing Tables (in Neo4j)</h4>
              <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
                {comparison.existingTables.length === 0 ? (
                  <div className="text-sm text-muted">No tables in Neo4j yet</div>
                ) : (
                  comparison.existingTables.map((table) => (
                    <div key={table.name} className="p-2 rounded bg-accent flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{table.displayName}</div>
                        <div className="text-xs text-muted">{table.columns.length} columns</div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete table "${table.name}" and all its relationships?`)) return;
                          setDeleting(true);
                          try {
                            await deleteSchemaTable(table.name);
                            await loadComparison();
                          } catch (err) {
                            console.error("Failed to delete table:", err);
                            alert("Failed to delete table");
                          } finally {
                            setDeleting(false);
                          }
                        }}
                        disabled={deleting}
                        className="text-red-400 hover:text-red-300 text-sm ml-2 disabled:opacity-50"
                        title="Delete table"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
        {selectedTables.size > 0 && (
          <button
            onClick={handleImportTables}
            disabled={importing}
            className="mt-6 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium"
          >
            {importing ? "Importing..." : `Import Selected (${selectedTables.size})`}
          </button>
        )}

        {/* Changed Tables */}
        {comparison && comparison.changedTables && comparison.changedTables.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-medium mb-2 text-amber-400">Changed Tables (schema differs from MSSQL)</h4>
            <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
              {comparison.changedTables.map((table) => (
                <label key={table.name} className="flex items-start gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSyncTables.has(table.name)}
                    onChange={(e) => {
                      const newSet = new Set(selectedSyncTables);
                      if (e.target.checked) newSet.add(table.name);
                      else newSet.delete(table.name);
                      setSelectedSyncTables(newSet);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{table.displayName}</div>
                    <div className="text-xs text-muted">{table.columns.length} columns (from MSSQL)</div>
                  </div>
                </label>
              ))}
            </div>
            {selectedSyncTables.size > 0 && (
              <button
                onClick={handleSyncTables}
                disabled={syncing}
                className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-lg text-sm font-medium"
              >
                {syncing ? "Syncing..." : `Sync Selected (${selectedSyncTables.size})`}
              </button>
            )}
          </div>
        )}

        {/* MSSQL Foreign Keys */}
        {comparison && comparison.mssqlForeignKeys && comparison.mssqlForeignKeys.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-medium mb-2 text-purple-400">MSSQL Foreign Keys</h4>
            <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
              {comparison.mssqlForeignKeys.map((fk) => {
                const key = `${fk.fromTable}.${fk.fromColumn}->${fk.toTable}.${fk.toColumn}`;
                return (
                  <label key={key} className="flex items-start gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMssqlFks.has(key)}
                      onChange={(e) => {
                        const newSet = new Set(selectedMssqlFks);
                        if (e.target.checked) newSet.add(key);
                        else newSet.delete(key);
                        setSelectedMssqlFks(newSet);
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 text-sm font-mono">
                      <span className="font-medium">{fk.fromTable}</span>
                      <span className="text-muted">.{fk.fromColumn}</span>
                      <span className="text-muted mx-2">&rarr;</span>
                      <span className="font-medium">{fk.toTable}</span>
                      <span className="text-muted">.{fk.toColumn}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            {selectedMssqlFks.size > 0 && (
              <button
                onClick={handleImportMssqlFks}
                className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium"
              >
                Import Selected FK ({selectedMssqlFks.size})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
