import { useEffect, useState, useCallback } from "react";
import ForeignKeyTab from "../components/schema/ForeignKeyTab";
import { fetchSchemaGraph } from "../lib/api";
import type { GraphData } from "../types";

export default function ForeignKeysPage() {
  const [schemaGraph, setSchemaGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchemaGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSchemaGraph();
      setSchemaGraph(data);
    } catch (err) {
      console.error("Failed to load schema graph:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemaGraph();
  }, [loadSchemaGraph]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        Loading...
      </div>
    );
  }

  return <ForeignKeyTab schemaGraph={schemaGraph} onReload={loadSchemaGraph} />;
}
