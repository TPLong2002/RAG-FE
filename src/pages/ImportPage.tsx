import { useEffect, useState, useCallback } from "react";
import { fetchSchemaComparison, importTables, syncTables, deleteSchemaTable, createForeignKey } from "../lib/api";
import type { SchemaComparison, TableDetail, TableColumn } from "../types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function ColumnDetailPanel({ columns }: { columns: TableColumn[] }) {
  return (
    <div className="px-4 pb-3 pt-2 border-t border-gray-300 bg-gray-200">
      <div className="text-xs font-medium text-gray-600 mb-2">Columns ({columns.length}):</div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {columns.map((col) => (
          <div key={col.name} className="text-xs font-mono px-1 text-gray-700">
            {col.isPrimaryKey && <span className="text-yellow-600">PK </span>}
            {col.name} <span className="text-gray-500">{col.type}</span>
            {col.nullable ? <span className="text-gray-400"> NULL</span> : <span className="text-gray-500"> NOT NULL</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DraggableTableItem({
  table,
  isSelected,
  onToggleSelect,
  isExpanded,
  onToggleExpand,
  isDragDisabled,
}: {
  table: TableDetail;
  isSelected: boolean;
  onToggleSelect: (checked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.name,
    disabled: isDragDisabled,
    data: { table },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-start gap-2 p-2 hover:bg-surface-hover">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(e.target.checked)}
            className="mt-1"
          />
          <div
            className="flex-1 text-sm cursor-grab active:cursor-grabbing"
            {...listeners}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-1.5">
                <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="4" cy="3" r="1.5"/>
                  <circle cx="4" cy="8" r="1.5"/>
                  <circle cx="4" cy="13" r="1.5"/>
                  <circle cx="10" cy="3" r="1.5"/>
                  <circle cx="10" cy="8" r="1.5"/>
                  <circle cx="10" cy="13" r="1.5"/>
                </svg>
                {table.displayName}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                {isExpanded ? '▼' : '▶'} Details
              </button>
            </div>
            <div className="text-xs text-muted">{table.columns.length} columns</div>
          </div>
        </div>
        {isExpanded && <ColumnDetailPanel columns={table.columns} />}
      </div>
    </div>
  );
}

function DroppableExistingTables({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'existing-tables-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 border rounded-lg p-3 bg-surface transition-colors duration-200 ${
        isOver
          ? 'border-dashed border-2 border-blue-400 bg-blue-50'
          : 'border-border'
      }`}
    >
      {isOver && (
        <div className="text-center text-xs text-blue-600 font-medium py-1">
          Drop here to import
        </div>
      )}
      {children}
    </div>
  );
}

export default function ImportPage() {
  const [comparison, setComparison] = useState<SchemaComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedSyncTables, setSelectedSyncTables] = useState<Set<string>>(new Set());
  const [selectedRenamedTables, setSelectedRenamedTables] = useState<Set<string>>(new Set());
  const [selectedMssqlFks, setSelectedMssqlFks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [syncingRenamed, setSyncingRenamed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [activeDragTable, setActiveDragTable] = useState<TableDetail | null>(null);
  const [droppingTable, setDroppingTable] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadComparison = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchemaComparison();
      setComparison(data);
      setSelectedTables(new Set());
      setSelectedSyncTables(new Set());
      setSelectedRenamedTables(new Set());
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

  const handleSyncRenamedTables = useCallback(async () => {
    if (selectedRenamedTables.size === 0) return;
    setSyncingRenamed(true);
    try {
      // Use syncTables API for renamed tables as well (logic is in backend)
      const result = await syncTables(Array.from(selectedRenamedTables));
      alert(`Updated ${result.synced} renamed tables successfully${result.errors.length > 0 ? `. Errors: ${result.errors.join(", ")}` : ""}`);
      setSelectedRenamedTables(new Set());
      await loadComparison();
    } catch (err) {
      console.error("Failed to sync renamed tables:", err);
      alert("Failed to sync renamed tables");
    } finally {
      setSyncingRenamed(false);
    }
  }, [selectedRenamedTables, loadComparison]);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const table = (event.active.data.current as { table: TableDetail })?.table;
    setActiveDragTable(table || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragTable(null);

    const { active, over } = event;
    if (!over || over.id !== 'existing-tables-drop-zone') return;

    const tableName = active.id as string;
    setDroppingTable(tableName);

    try {
      const result = await importTables([tableName]);
      alert(
        `Imported "${tableName}" successfully${
          result.errors.length > 0 ? `. Errors: ${result.errors.join(', ')}` : ''
        }`
      );
      await loadComparison();
    } catch (err) {
      console.error('Failed to import table via drag:', err);
      alert('Failed to import table');
    } finally {
      setDroppingTable(null);
    }
  }, [loadComparison]);

  const toggleExpand = useCallback((tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) newSet.delete(tableName);
      else newSet.add(tableName);
      return newSet;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
    );
  }

  // Filter tables based on search term
  const filterTables = (tables: TableDetail[]) => {
    if (!searchTerm.trim()) return tables;
    const term = searchTerm.toLowerCase();
    return tables.filter(table =>
      table.name.toLowerCase().includes(term) ||
      table.displayName.toLowerCase().includes(term)
    );
  };

  const filteredNewTables = filterTables(comparison?.newTables || []);
  const filteredChangedTables = filterTables(comparison?.changedTables || []);
  const filteredRenamedTables = filterTables(comparison?.renamedTables || []);
  const filteredExistingTables = filterTables(comparison?.existingTables || []);

  return (
    <div className="flex-1 overflow-auto p-1">
      <div className="mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Import MSSQL Tables</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {comparison ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-1 text-emerald-400">New Tables (from MSSQL)</h4>
                <p className="text-xs text-muted mb-2">Drag to "Existing Tables" to import, or use checkboxes</p>
                <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
                  {filteredNewTables.length === 0 ? (
                    <div className="text-sm text-muted">All tables already imported</div>
                  ) : (
                    filteredNewTables.map((table) => (
                      <DraggableTableItem
                        key={table.name}
                        table={table}
                        isSelected={selectedTables.has(table.name)}
                        onToggleSelect={(checked) => {
                          const newSet = new Set(selectedTables);
                          if (checked) newSet.add(table.name);
                          else newSet.delete(table.name);
                          setSelectedTables(newSet);
                        }}
                        isExpanded={expandedTables.has(table.name)}
                        onToggleExpand={() => toggleExpand(table.name)}
                        isDragDisabled={importing || droppingTable !== null}
                      />
                    ))
                  )}
                </div>
                {selectedTables.size > 0 && (
                  <button
                    onClick={handleImportTables}
                    disabled={importing}
                    className="mt-3 w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium"
                  >
                    {importing ? "Importing..." : `Import Selected (${selectedTables.size})`}
                  </button>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-blue-400">Existing Tables (in Neo4j)</h4>
                <DroppableExistingTables>
                  {filteredExistingTables.length === 0 ? (
                    <div className="text-sm text-muted">No tables in Neo4j yet</div>
                  ) : (
                    filteredExistingTables.map((table) => {
                      const isExpanded = expandedTables.has(table.name);
                      return (
                        <div key={table.name} className="border border-gray-700 rounded-lg overflow-hidden">
                          <div className="p-2 bg-accent flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{table.displayName}</div>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(table.name)}
                                  className="text-xs text-gray-400 hover:text-gray-300"
                                >
                                  {isExpanded ? '▼' : '▶'} Details
                                </button>
                              </div>
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
                          {isExpanded && <ColumnDetailPanel columns={table.columns} />}
                        </div>
                      );
                    })
                  )}
                </DroppableExistingTables>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-amber-400">Changed Tables</h4>
                <div className="space-y-2 border border-border rounded-lg p-3 bg-surface">
                  {filteredChangedTables.length === 0 && filteredRenamedTables.length === 0 ? (
                    <div className="text-sm text-muted">No schema changes or renamed tables</div>
                  ) : (
                    <>
                      {filteredChangedTables.map((table) => {
                        const isExpanded = expandedTables.has(table.name);
                        return (
                          <div key={table.name} className="border border-gray-700 rounded-lg overflow-hidden">
                            <label className="flex items-start gap-2 p-2 hover:bg-surface-hover cursor-pointer">
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
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{table.displayName}</div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleExpand(table.name);
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-300"
                                  >
                                    {isExpanded ? '▼' : '▶'} Details
                                  </button>
                                </div>
                                <div className="text-xs text-muted">{table.columns.length} columns (schema differs)</div>
                                {table.changeSummary && (
                                  <div className="text-xs text-amber-400 mt-1">{table.changeSummary}</div>
                                )}
                              </div>
                            </label>

                            {isExpanded && (
                              <div className="px-4 pb-3 pt-2 border-t border-gray-300 bg-gray-200">
                                {/* Column changes summary */}
                                {table.columnChanges && table.columnChanges.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-gray-600 mb-2">Changes:</div>
                                    <div className="space-y-1">
                                      {table.columnChanges.map((change, idx) => {
                                        let changeLabel = '';
                                        let changeColor = '';
                                        switch (change.changeType) {
                                          case 'added': changeLabel = 'Added'; changeColor = 'text-emerald-700'; break;
                                          case 'removed': changeLabel = 'Removed'; changeColor = 'text-red-700'; break;
                                          case 'type-changed': changeLabel = 'Type changed'; changeColor = 'text-amber-700'; break;
                                          case 'nullability-changed': changeLabel = 'Nullability changed'; changeColor = 'text-blue-700'; break;
                                          case 'primary-key-changed': changeLabel = 'PK changed'; changeColor = 'text-purple-700'; break;
                                          default: changeLabel = 'Modified'; changeColor = 'text-gray-600';
                                        }
                                        return (
                                          <div key={idx} className="text-xs flex items-center gap-2">
                                            <span className={`${changeColor} font-medium`}>{changeLabel}:</span>
                                            <span className="text-gray-800">{change.columnName}</span>
                                            {change.oldValue && <span className="text-gray-500">(was: {change.oldValue})</span>}
                                            {change.newValue && <span className="text-gray-800">→ {change.newValue}</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {/* Side-by-side column comparison */}
                                {table.neo4jColumns && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-2">Column Comparison (MSSQL vs Neo4j):</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <div className="text-emerald-700 font-medium mb-1">MSSQL ({table.columns.length} cols)</div>
                                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                          {table.columns.map((col) => {
                                            const neo4jCol = table.neo4jColumns?.find(c => c.name === col.name);
                                            const isDiff = !neo4jCol ||
                                              neo4jCol.type !== col.type ||
                                              neo4jCol.nullable !== col.nullable ||
                                              neo4jCol.isPrimaryKey !== col.isPrimaryKey;
                                            return (
                                              <div key={col.name} className={`font-mono px-1 rounded ${isDiff ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600'}`}>
                                                {col.isPrimaryKey && <span className="text-yellow-600">PK </span>}
                                                {col.name} <span className={isDiff ? 'text-emerald-600' : 'text-gray-500'}>{col.type}</span>
                                                {col.nullable ? <span className={isDiff ? 'text-emerald-500' : 'text-gray-400'}> NULL</span> : <span className={isDiff ? 'text-emerald-600' : 'text-gray-500'}> NOT NULL</span>}
                                                {!neo4jCol && <span className="text-emerald-700 ml-1">(new)</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-blue-700 font-medium mb-1">Neo4j ({table.neo4jColumns.length} cols)</div>
                                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                          {table.neo4jColumns.map((col) => {
                                            const mssqlCol = table.columns.find(c => c.name === col.name);
                                            const isDiff = !mssqlCol ||
                                              mssqlCol.type !== col.type ||
                                              mssqlCol.nullable !== col.nullable ||
                                              mssqlCol.isPrimaryKey !== col.isPrimaryKey;
                                            return (
                                              <div key={col.name} className={`font-mono px-1 rounded ${isDiff ? 'bg-red-100 text-red-800' : 'text-gray-600'}`}>
                                                {col.isPrimaryKey && <span className="text-yellow-600">PK </span>}
                                                {col.name} <span className={isDiff ? 'text-red-600' : 'text-gray-500'}>{col.type}</span>
                                                {col.nullable ? <span className={isDiff ? 'text-red-500' : 'text-gray-400'}> NULL</span> : <span className={isDiff ? 'text-red-600' : 'text-gray-500'}> NOT NULL</span>}
                                                {!mssqlCol && <span className="text-red-700 ml-1">(removed)</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredRenamedTables.map((table) => {
                        const isExpanded = expandedTables.has(table.name);
                        return (
                          <div key={table.name} className="border border-gray-700 rounded-lg overflow-hidden">
                            <label className="flex items-start gap-2 p-2 hover:bg-surface-hover cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedRenamedTables.has(table.name)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedRenamedTables);
                                  if (e.target.checked) newSet.add(table.name);
                                  else newSet.delete(table.name);
                                  setSelectedRenamedTables(newSet);
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{table.displayName}</div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleExpand(table.name);
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-300"
                                  >
                                    {isExpanded ? '▼' : '▶'} Details
                                  </button>
                                </div>
                                <div className="text-xs text-muted">{table.columns.length} columns (renamed)</div>
                                {table.changeSummary && (
                                  <div className="text-xs text-cyan-400 mt-1">{table.changeSummary}</div>
                                )}
                                {table.objectId && (
                                  <div className="text-xs text-gray-500 mt-1">Object ID: {table.objectId}</div>
                                )}
                              </div>
                            </label>

                            {isExpanded && (
                              <div className="px-4 pb-3 pt-2 border-t border-gray-300 bg-gray-200">
                                <div className="text-xs font-medium text-gray-600 mb-2">Table Rename Details:</div>
                                {table.oldName && (
                                  <div className="text-xs text-gray-700">
                                    Old name: <span className="font-mono text-red-700">{table.oldName}</span> → New name: <span className="font-mono text-emerald-700">{table.name}</span>
                                  </div>
                                )}
                                {/* Column changes for renamed tables */}
                                {table.columnChanges && table.columnChanges.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-600 mb-1">Column Changes:</div>
                                    <div className="space-y-1">
                                      {table.columnChanges.map((change, idx) => {
                                        let changeLabel = '';
                                        let changeColor = '';
                                        switch (change.changeType) {
                                          case 'added': changeLabel = 'Added'; changeColor = 'text-emerald-700'; break;
                                          case 'removed': changeLabel = 'Removed'; changeColor = 'text-red-700'; break;
                                          case 'type-changed': changeLabel = 'Type changed'; changeColor = 'text-amber-700'; break;
                                          case 'nullability-changed': changeLabel = 'Nullability changed'; changeColor = 'text-blue-700'; break;
                                          case 'primary-key-changed': changeLabel = 'PK changed'; changeColor = 'text-purple-700'; break;
                                          default: changeLabel = 'Modified'; changeColor = 'text-gray-600';
                                        }
                                        return (
                                          <div key={idx} className="text-xs flex items-center gap-2">
                                            <span className={`${changeColor} font-medium`}>{changeLabel}:</span>
                                            <span className="text-gray-800">{change.columnName}</span>
                                            {change.oldValue && <span className="text-gray-500">(was: {change.oldValue})</span>}
                                            {change.newValue && <span className="text-gray-800">→ {change.newValue}</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {/* Side-by-side comparison for renamed tables */}
                                {table.neo4jColumns && (
                                  <div className="mt-2">
                                    <div className="text-xs font-medium text-gray-600 mb-2">Column Comparison (MSSQL vs Neo4j):</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <div className="text-emerald-700 font-medium mb-1">MSSQL ({table.columns.length} cols)</div>
                                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                          {table.columns.map((col) => {
                                            const neo4jCol = table.neo4jColumns?.find(c => c.name === col.name);
                                            const isDiff = !neo4jCol ||
                                              neo4jCol.type !== col.type ||
                                              neo4jCol.nullable !== col.nullable ||
                                              neo4jCol.isPrimaryKey !== col.isPrimaryKey;
                                            return (
                                              <div key={col.name} className={`font-mono px-1 rounded ${isDiff ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600'}`}>
                                                {col.isPrimaryKey && <span className="text-yellow-600">PK </span>}
                                                {col.name} <span className={isDiff ? 'text-emerald-600' : 'text-gray-500'}>{col.type}</span>
                                                {col.nullable ? <span className={isDiff ? 'text-emerald-500' : 'text-gray-400'}> NULL</span> : <span className={isDiff ? 'text-emerald-600' : 'text-gray-500'}> NOT NULL</span>}
                                                {!neo4jCol && <span className="text-emerald-700 ml-1">(new)</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-blue-700 font-medium mb-1">Neo4j ({table.neo4jColumns.length} cols)</div>
                                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                          {table.neo4jColumns.map((col) => {
                                            const mssqlCol = table.columns.find(c => c.name === col.name);
                                            const isDiff = !mssqlCol ||
                                              mssqlCol.type !== col.type ||
                                              mssqlCol.nullable !== col.nullable ||
                                              mssqlCol.isPrimaryKey !== col.isPrimaryKey;
                                            return (
                                              <div key={col.name} className={`font-mono px-1 rounded ${isDiff ? 'bg-red-100 text-red-800' : 'text-gray-600'}`}>
                                                {col.isPrimaryKey && <span className="text-yellow-600">PK </span>}
                                                {col.name} <span className={isDiff ? 'text-red-600' : 'text-gray-500'}>{col.type}</span>
                                                {col.nullable ? <span className={isDiff ? 'text-red-500' : 'text-gray-400'}> NULL</span> : <span className={isDiff ? 'text-red-600' : 'text-gray-500'}> NOT NULL</span>}
                                                {!mssqlCol && <span className="text-red-700 ml-1">(removed)</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {!table.neo4jColumns && !table.columnChanges?.length && (
                                  <div className="text-xs text-gray-600 mt-2">
                                    {table.columns.length} columns (no column changes)
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
                {(selectedSyncTables.size > 0 || selectedRenamedTables.size > 0) && (
                  <div className="mt-3 space-x-2">
                    {selectedSyncTables.size > 0 && (
                      <button
                        onClick={handleSyncTables}
                        disabled={syncing}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-lg text-sm font-medium"
                      >
                        {syncing ? "Syncing..." : `Sync Changed (${selectedSyncTables.size})`}
                      </button>
                    )}
                    {selectedRenamedTables.size > 0 && (
                      <button
                        onClick={handleSyncRenamedTables}
                        disabled={syncingRenamed}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white rounded-lg text-sm font-medium"
                      >
                        {syncingRenamed ? "Updating..." : `Update Renamed (${selectedRenamedTables.size})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DragOverlay>
              {activeDragTable ? (
                <div className="bg-surface border border-border rounded-lg p-3 shadow-lg opacity-90 w-64">
                  <div className="text-sm font-medium">{activeDragTable.displayName}</div>
                  <div className="text-xs text-muted">{activeDragTable.columns.length} columns</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}



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
