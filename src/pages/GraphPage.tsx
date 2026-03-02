import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchDocumentGraph, fetchRelatedDocuments } from "../lib/api";
import type { GraphData, RelatedDocument } from "../types";

export default function GraphPage() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("doc");

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(docId);

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

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Document Graph</h2>
        <p className="text-sm text-muted mt-1">View document relationships</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted">Loading...</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {selectedDoc && relatedDocs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Related Documents</h3>
              <div className="space-y-2">
                {relatedDocs.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="p-3 border border-border rounded-lg hover:bg-surface-hover cursor-pointer"
                    onClick={() => setSelectedDoc(doc.documentId)}
                  >
                    <div className="font-medium">{doc.fileName}</div>
                    <div className="text-sm text-muted mt-1">
                      Similarity: {doc.score.toFixed(3)} • {doc.connectionCount} connections
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {graphData && graphData.nodes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  {selectedDoc ? "Current Document & Related" : "All Documents"}
                </h3>
                {selectedDoc && (
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-xs text-primary hover:text-primary-hover"
                  >
                    View All
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {graphData.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      node.id === selectedDoc
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-surface-hover"
                    }`}
                    onClick={() => setSelectedDoc(node.id)}
                  >
                    <div className="font-medium">{node.label}</div>
                    <div className="text-sm text-muted mt-1">
                      Type: {node.properties.fileType as string} •{" "}
                      {node.properties.totalChunks as number} chunks
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {graphData && graphData.nodes.length === 0 && (
            <div className="text-center py-8 text-muted">
              No documents found. Upload documents to see relationships.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
