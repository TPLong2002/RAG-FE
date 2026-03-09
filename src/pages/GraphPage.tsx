import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import { fetchDocumentGraph, fetchRelatedDocuments, fetchChunkGraph, fetchSchemaGraph, deleteSchemaTable, deleteForeignKey, createForeignKey, updateTable } from "../lib/api";
import type { GraphData, RelatedDocument, TableColumn, GraphNode } from "../types";
import EditTableModal from "../components/schema/EditTableModal";

interface GraphNode2D {
  id: string;
  label: string;
  type: "document" | "chunk" | "table";
  isExternal?: boolean;
  isSelected?: boolean;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface GraphLink2D {
  source: string | GraphNode2D;
  target: string | GraphNode2D;
  type: string;
  score?: number;
  fromColumn?: string;
  toColumn?: string;
}

function getNodeId(endpoint: string | GraphNode2D): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function isSelfReference(link: GraphLink2D): boolean {
  return getNodeId(link.source) === getNodeId(link.target);
}

function toForceData(data: GraphData, selectedDoc?: string | null) {
  const nodes: GraphNode2D[] = data.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    isExternal: n.properties.external as boolean,
    isSelected: n.id === selectedDoc,
    properties: n.properties,
  }));

  const links: GraphLink2D[] = data.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    score: e.properties.score as number | undefined,
    fromColumn: e.properties.fromColumn as string | undefined,
    toColumn: e.properties.toColumn as string | undefined,
  }));

  return { nodes, links };
}

const COLORS = {
  docNode: "#6366f1",
  docNodeSelected: "#f59e0b",
  chunkNode: "#22d3ee",
  chunkExternal: "#f97316",
  tableNode: "#10b981",
  edgeRelated: "#6366f180",
  edgeNext: "#22d3ee60",
  edgeSimilar: "#f9731680",
  edgeForeignKey: "#10b98180",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
};

export default function GraphPage() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("doc");

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [chunkGraph, setChunkGraph] = useState<GraphData | null>(null);
  const [schemaGraph, setSchemaGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "chunks" | "schema">("overview");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(docId);
  const [hoveredNode, setHoveredNode] = useState<GraphNode2D | null>(null);
  const [selectedSchemaNode, setSelectedSchemaNode] = useState<GraphNode2D | null>(null);
  const [deleting, setDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const [editMode, setEditMode] = useState(false);
  const [dragSource, setDragSource] = useState<GraphNode2D | null>(null);
  const [showFkModal, setShowFkModal] = useState(false);
  const [fkForm, setFkForm] = useState({
    fromTable: "",
    toTable: "",
    fromCol: "",
    toCol: ""
  });
  const [editingTable, setEditingTable] = useState(false);
  const [tableEditColumns, setTableEditColumns] = useState<TableColumn[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDocumentGraph(selectedDoc || undefined);
      setGraphData(data);

      if (selectedDoc) {
        const { related } = await fetchRelatedDocuments(selectedDoc);
        setRelatedDocs(related);
      } else {
        setRelatedDocs([]);
      }
    } catch (err) {
      console.error("Failed to load graph:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  const loadChunkGraph = useCallback(async () => {
    if (!selectedDoc) return;
    setLoading(true);
    try {
      const data = await fetchChunkGraph(selectedDoc);
      setChunkGraph(data);
    } catch (err) {
      console.error("Failed to load chunk graph:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  const loadSchemaGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchemaGraph(selectedDoc || undefined);
      setSchemaGraph(data);
    } catch (err) {
      console.error("Failed to load schema graph:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  const handleDeleteTable = useCallback(async (tableName: string) => {
    if (!confirm(`Delete table "${tableName}" and all its relationships?`)) return;
    setDeleting(true);
    try {
      await deleteSchemaTable(tableName);
      setSelectedSchemaNode(null);
      await loadSchemaGraph();
    } catch (err) {
      console.error("Failed to delete table:", err);
      alert("Failed to delete table");
    } finally {
      setDeleting(false);
    }
  }, [loadSchemaGraph]);

  const handleDeleteFK = useCallback(async (fromTable: string, toTable: string, fromColumn: string, toColumn: string) => {
    if (!confirm(`Delete foreign key ${fromColumn} -> ${toColumn}?`)) return;
    setDeleting(true);
    try {
      await deleteForeignKey(fromTable, toTable, fromColumn, toColumn);
      await loadSchemaGraph();
    } catch (err) {
      console.error("Failed to delete foreign key:", err);
      alert("Failed to delete foreign key");
    } finally {
      setDeleting(false);
    }
  }, [loadSchemaGraph]);

  useEffect(() => {
    setSelectedSchemaNode(null);
    setEditMode(false);
    setDragSource(null);
    if (activeTab === "overview") loadGraph();
    else if (activeTab === "chunks" && selectedDoc) loadChunkGraph();
    else if (activeTab === "schema") loadSchemaGraph();
  }, [activeTab, loadGraph, loadChunkGraph, loadSchemaGraph, selectedDoc]);

  const overviewForceData = useMemo(
    () => (graphData ? toForceData(graphData, selectedDoc) : null),
    [graphData, selectedDoc],
  );

  const chunkForceData = useMemo(
    () => (chunkGraph ? toForceData(chunkGraph, selectedDoc) : null),
    [chunkGraph, selectedDoc],
  );

  const schemaForceData = useMemo(
    () => (schemaGraph ? toForceData(schemaGraph, selectedDoc) : null),
    [schemaGraph, selectedDoc],
  );

  const existingFkByPair = useMemo(() => {
    const map = new Map<string, { fromCol: string; toCol: string }>();
    if (!schemaForceData) return map;

    schemaForceData.links.forEach((link) => {
      if (link.type !== "FOREIGN_KEY") return;
      const key = `${getNodeId(link.source)}->${getNodeId(link.target)}`;
      if (map.has(key)) return;
      map.set(key, {
        fromCol: link.fromColumn ?? "",
        toCol: link.toColumn ?? "",
      });
    });

    return map;
  }, [schemaForceData]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-4">
        <h2 className="text-lg font-semibold">Document Graph</h2>
        {selectedDoc && (
          <button
            onClick={() => { setSelectedDoc(null); setActiveTab("overview"); }}
            className="text-xs text-primary-text hover:text-primary-hover"
          >
            View All
          </button>
        )}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded text-xs ${activeTab === "overview" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
          >
            Documents
          </button>
          {selectedDoc && (
            <button
              onClick={() => setActiveTab("chunks")}
              className={`px-3 py-1 rounded text-xs ${activeTab === "chunks" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
            >
              Chunks
            </button>
          )}
          <button
            onClick={() => setActiveTab("schema")}
            className={`px-3 py-1 rounded text-xs ${activeTab === "schema" ? "bg-primary text-primary-text" : "bg-surface text-muted"}`}
          >
            Schema
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Graph canvas */}
          <div ref={containerRef} className="flex-1 relative bg-background min-w-0 overflow-hidden">
            {dimensions.width === 0 ? null : activeTab === "overview" && overviewForceData && overviewForceData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={overviewForceData}
                nodeRelSize={8}
                nodeCanvasObject={(node: GraphNode2D, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const r = node.isSelected ? 12 : 8;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                  ctx.fillStyle = node.isSelected ? COLORS.docNodeSelected : COLORS.docNode;
                  ctx.fill();
                  ctx.strokeStyle = "#fff";
                  ctx.lineWidth = 1.5;
                  ctx.stroke();

                  const fontSize = Math.max(10 / globalScale, 3);
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = COLORS.text;
                  const label = node.label.length > 25 ? node.label.slice(0, 22) + "..." : node.label;
                  ctx.fillText(label, node.x!, node.y! + r + 3);
                }}
                linkColor={() => COLORS.edgeRelated}
                linkWidth={2}
                linkDirectionalArrowLength={6}
                linkDirectionalArrowRelPos={1}
                linkLabel={(link: GraphLink2D) =>
                  link.score != null ? `${link.type} (${link.score.toFixed(3)})` : link.type
                }
                onNodeClick={(node: GraphNode2D) => setSelectedDoc(node.id)}
                onNodeHover={(node: GraphNode2D | null) => setHoveredNode(node)}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : activeTab === "chunks" && chunkForceData && chunkForceData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={chunkForceData}
                nodeRelSize={6}
                nodeCanvasObject={(node: GraphNode2D, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const r = node.isExternal ? 5 : 6;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                  ctx.fillStyle = node.isExternal ? COLORS.chunkExternal : COLORS.chunkNode;
                  ctx.fill();

                  const fontSize = Math.max(9 / globalScale, 2.5);
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillStyle = COLORS.textMuted;
                  ctx.fillText(node.label, node.x!, node.y! + r + 2);
                }}
                linkColor={(link: GraphLink2D) =>
                  link.type === "NEXT_CHUNK" ? COLORS.edgeNext : COLORS.edgeSimilar
                }
                linkWidth={(link: GraphLink2D) => (link.type === "NEXT_CHUNK" ? 1.5 : 2)}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkLineDash={(link: GraphLink2D) =>
                  link.type === "SIMILAR_TO" ? [4, 2] : null
                }
                linkLabel={(link: GraphLink2D) =>
                  link.score != null ? `${link.type} (${link.score.toFixed(3)})` : link.type
                }
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : activeTab === "schema" && schemaForceData && schemaForceData.nodes.length > 0 ? (
              <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={schemaForceData}
                nodeRelSize={8}
                nodeCanvasObject={(node: GraphNode2D, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const label = node.label.length > 20 ? node.label.slice(0, 17) + "..." : node.label;
                  const fontSize = Math.max(11 / globalScale, 3);
                  ctx.font = `bold ${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const padding = 4;
                  const w = textWidth + padding * 2;
                  const h = fontSize + padding * 2;

                  ctx.fillStyle = COLORS.tableNode;
                  ctx.beginPath();
                  ctx.roundRect(node.x! - w / 2, node.y! - h / 2, w, h, 4);
                  ctx.fill();
                  ctx.strokeStyle = "#fff";
                  ctx.lineWidth = 1;
                  ctx.stroke();

                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillStyle = "#fff";
                  ctx.fillText(label, node.x!, node.y!);
                }}
                linkColor={() => COLORS.edgeForeignKey}
                linkWidth={2}
                linkDirectionalArrowLength={8}
                linkDirectionalArrowRelPos={(link: GraphLink2D) => (isSelfReference(link) ? 0.6 : 1)}
                linkCurvature={(link: GraphLink2D) => (isSelfReference(link) ? 0.55 : 0)}
                linkLabel={(link: GraphLink2D) =>
                  link.fromColumn ? `FK: ${link.fromColumn} -> ${link.toColumn}` : link.type
                }
                onNodeClick={(node: GraphNode2D) => {
                  if (editMode) {
                    if (!dragSource) {
                      setDragSource(node);
                    } else {
                      const fromTable = dragSource.id;
                      const toTable = node.id;
                      const existingFk = existingFkByPair.get(`${fromTable}->${toTable}`);

                      setShowFkModal(true);
                      setFkForm({
                        fromTable,
                        toTable,
                        fromCol: existingFk?.fromCol ?? "",
                        toCol: existingFk?.toCol ?? "",
                      });
                    }
                  } else {
                    setSelectedSchemaNode(prev => prev?.id === node.id ? null : node);
                  }
                }}
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted text-sm h-full">
                {activeTab === "chunks" && !selectedDoc
                  ? "Select a document to view its chunk graph."
                  : activeTab === "schema"
                    ? "No schema data. Upload database documents to extract tables."
                    : "No graph data. Upload documents to see relationships."}
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-1.5">
              {activeTab === "overview" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.docNode }} />
                    Document
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.docNodeSelected }} />
                    Selected
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block" style={{ background: COLORS.edgeRelated }} />
                    RELATED_TO
                  </div>
                </>
              ) : activeTab === "chunks" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.chunkNode }} />
                    Chunk
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS.chunkExternal }} />
                    External
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block" style={{ background: COLORS.edgeNext }} />
                    NEXT_CHUNK
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block border-t border-dashed" style={{ borderColor: COLORS.edgeSimilar }} />
                    SIMILAR_TO
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-3 rounded inline-block" style={{ background: COLORS.tableNode }} />
                    Table
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 inline-block" style={{ background: COLORS.edgeForeignKey }} />
                    FOREIGN_KEY
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 border-l border-border bg-surface overflow-y-auto p-4 space-y-4">
            {/* Hover info (documents & chunks) */}
            {hoveredNode && hoveredNode.type !== "table" && (
              <div className="p-3 bg-accent rounded-lg border border-border">
                <div className="text-sm font-medium mb-1">{hoveredNode.label}</div>
                {hoveredNode.type === "document" && (
                  <div className="text-xs text-muted space-y-0.5">
                    <div>Type: {hoveredNode.properties.fileType as string}</div>
                    <div>Chunks: {hoveredNode.properties.totalChunks as number}</div>
                  </div>
                )}
                {hoveredNode.type === "chunk" && !!hoveredNode.properties.textPreview && (
                  <div className="text-xs text-muted mt-1">{String(hoveredNode.properties.textPreview)}</div>
                )}
              </div>
            )}

            {/* Selected schema node info (click to show) */}
            {activeTab === "schema" && selectedSchemaNode && (
              <div className="p-3 bg-accent rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{selectedSchemaNode.label}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        let columns: TableColumn[] = [];
                        try {
                          columns = selectedSchemaNode.properties.columns
                            ? JSON.parse(String(selectedSchemaNode.properties.columns))
                            : [];
                        } catch {}
                        setTableEditColumns(columns);
                        setEditingTable(true);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                      title="Edit table"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTable(selectedSchemaNode.id)}
                      disabled={deleting}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Delete table"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSchemaNode(null);
                        setEditingTable(false);
                      }}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted space-y-1">
                  {selectedSchemaNode.properties.description ? (
                    <div className="italic">{String(selectedSchemaNode.properties.description)}</div>
                  ) : (
                    <div className="italic text-muted/50">No description</div>
                  )}
                </div>
                <div className="text-xs text-muted space-y-1">
                  {selectedSchemaNode.properties.columns ? (() => {
                    try {
                      const cols = JSON.parse(String(selectedSchemaNode.properties.columns)) as Array<{
                        name: string; type: string; isPrimaryKey: boolean;
                      }>;
                      return (
                        <div className="mt-1">
                          <div className="font-medium mb-0.5">Columns:</div>
                          {cols.map((col) => (
                            <div key={col.name} className="flex gap-1 font-mono">
                              <span className="text-amber-400">{col.isPrimaryKey ? "PK" : "  "}</span>
                              <span>{col.name}</span>
                              <span className="text-muted">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })() : null}
                  {/* Foreign keys for this table */}
                  {schemaForceData && (() => {
                    const fks = schemaForceData.links.filter(
                      (l) => getNodeId(l.source) === selectedSchemaNode.id || getNodeId(l.target) === selectedSchemaNode.id
                    );
                    if (fks.length === 0) return null;
                    return (
                      <div className="mt-2">
                        <div className="font-medium mb-0.5">Foreign Keys:</div>
                        {fks.map((fk, i) => {
                          const sourceId = getNodeId(fk.source);
                          const targetId = getNodeId(fk.target);

                          return (
                            <div key={i} className="flex items-center justify-between gap-1 py-0.5">
                              <span className="font-mono truncate">
                                {sourceId}.{fk.fromColumn} → {targetId}.{fk.toColumn}
                              </span>
                              <button
                                onClick={() => handleDeleteFK(sourceId, targetId, fk.fromColumn!, fk.toColumn!)}
                                disabled={deleting}
                                className="text-red-400 hover:text-red-300 shrink-0 disabled:opacity-50"
                                title="Delete FK"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Stats */}
            {activeTab === "overview" && graphData && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Overview</h3>
                <div className="text-sm">
                  <span className="text-muted">Nodes:</span> {graphData.nodes.length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Edges:</span> {graphData.edges.length}
                </div>
              </div>
            )}

            {activeTab === "chunks" && chunkGraph && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Chunk Graph</h3>
                <div className="text-sm">
                  <span className="text-muted">Chunks:</span>{" "}
                  {chunkGraph.nodes.filter((n) => !n.properties.external).length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">External:</span>{" "}
                  {chunkGraph.nodes.filter((n) => n.properties.external).length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Sequential:</span>{" "}
                  {chunkGraph.edges.filter((e) => e.type === "NEXT_CHUNK").length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Similar:</span>{" "}
                  {chunkGraph.edges.filter((e) => e.type === "SIMILAR_TO").length}
                </div>
              </div>
            )}

            {activeTab === "schema" && schemaGraph && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Schema Graph</h3>
                <div className="text-sm">
                  <span className="text-muted">Tables:</span> {schemaGraph.nodes.length}
                </div>
                <div className="text-sm">
                  <span className="text-muted">Foreign Keys:</span> {schemaGraph.edges.length}
                </div>
                <button
                  onClick={() => {
                    setEditMode(!editMode);
                    setDragSource(null);
                  }}
                  className={`mt-2 w-full px-3 py-2 rounded text-xs font-medium ${editMode ? "bg-amber-500 text-white" : "bg-surface border border-border"}`}
                >
                  Edit Mode: {editMode ? "ON" : "OFF"}
                </button>
                {editMode && dragSource && (
                  <div className="p-2 bg-accent rounded text-xs">
                    <div className="font-medium">Selected:</div>
                    <div className="text-muted">{dragSource.label}</div>
                    <div className="mt-1 text-xs text-muted">Click target table to create FK (self-reference supported)</div>
                  </div>
                )}
              </div>
            )}

            {/* Related documents table */}
            {relatedDocs.length > 0 && activeTab === "overview" && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Related Documents</h3>
                {relatedDocs.map((doc) => (
                  <button
                    key={doc.documentId}
                    onClick={() => setSelectedDoc(doc.documentId)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-hover transition-colors border border-border"
                  >
                    <div className="text-sm font-medium truncate">{doc.fileName}</div>
                    <div className="text-xs text-muted">
                      Score: {doc.score.toFixed(3)} | {doc.connectionCount} connections
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Document list */}
            {activeTab === "overview" && graphData && graphData.nodes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Documents</h3>
                {graphData.nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedDoc(node.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors border ${
                      node.id === selectedDoc
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{node.label}</div>
                    <div className="text-xs text-muted">
                      {node.properties.fileType as string} | {node.properties.totalChunks as number} chunks
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Table list for schema tab */}
            {activeTab === "schema" && schemaGraph && schemaGraph.nodes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase text-muted">Tables</h3>
                {schemaGraph.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-2 rounded-lg border border-border"
                  >
                    <div className="text-sm font-medium">{node.label}</div>
                    {node.properties.description ? (
                      <div className="text-xs text-muted mt-0.5">{String(node.properties.description)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FK Creation Modal */}
      {showFkModal && dragSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Create Foreign Key</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted block mb-1">From Table</label>
                <div className="font-medium">{fkForm.fromTable}</div>
                <label className="text-sm text-muted block mb-1 mt-2">Column</label>
                <select
                  value={fkForm.fromCol}
                  onChange={(e) => setFkForm({ ...fkForm, fromCol: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                >
                  <option value="">Select column...</option>
                  {(() => {
                    const node = schemaForceData?.nodes.find(n => n.id === fkForm.fromTable);
                    if (!node?.properties.columns) return null;
                    try {
                      const cols = JSON.parse(String(node.properties.columns)) as TableColumn[];
                      return cols.map(col => (
                        <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">To Table</label>
                <div className="font-medium">{fkForm.toTable}</div>
                <label className="text-sm text-muted block mb-1 mt-2">Column</label>
                <select
                  value={fkForm.toCol}
                  onChange={(e) => setFkForm({ ...fkForm, toCol: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                >
                  <option value="">Select column...</option>
                  {(() => {
                    const node = schemaForceData?.nodes.find(n => n.id === fkForm.toTable);
                    if (!node?.properties.columns) return null;
                    try {
                      const cols = JSON.parse(String(node.properties.columns)) as TableColumn[];
                      return cols.map(col => (
                        <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowFkModal(false);
                  setDragSource(null);
                }}
                className="flex-1 px-4 py-2 bg-surface border border-border rounded text-sm hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!fkForm.fromCol || !fkForm.toCol) {
                    alert("Please select both columns");
                    return;
                  }
                  try {
                    await createForeignKey({
                      fromTable: fkForm.fromTable,
                      fromColumn: fkForm.fromCol,
                      toTable: fkForm.toTable,
                      toColumn: fkForm.toCol
                    });
                    setShowFkModal(false);
                    setDragSource(null);
                    setEditMode(false);
                    await loadSchemaGraph();
                  } catch (err) {
                    console.error("Failed to create FK:", err);
                    alert("Failed to create foreign key");
                  }
                }}
                disabled={!fkForm.fromCol || !fkForm.toCol}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded text-sm font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal (antd) */}
      {selectedSchemaNode && (
        <EditTableModal
          open={editingTable}
          tableName={selectedSchemaNode.id}
          initialDisplayName={selectedSchemaNode.properties.displayName as string || selectedSchemaNode.label}
          initialDescription={selectedSchemaNode.properties.description as string || ""}
          initialColumns={tableEditColumns}
          onSave={async (data) => {
            const nodeId = selectedSchemaNode.id;
            await updateTable(nodeId, {
              displayName: data.displayName,
              description: data.description,
              columns: data.columns,
            });
            setEditingTable(false);
            await loadSchemaGraph();

            const updatedGraph = await fetchSchemaGraph();
            const updatedNode = updatedGraph.nodes.find((n: GraphNode) => n.id === nodeId);
            if (updatedNode) {
              setSelectedSchemaNode({
                ...selectedSchemaNode,
                properties: updatedNode.properties,
                label: updatedNode.label,
              });
            }
          }}
          onCancel={() => setEditingTable(false)}
        />
      )}
    </div>
  );
}
