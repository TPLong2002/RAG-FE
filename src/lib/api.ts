const API_BASE = import.meta.env.VITE_BE_API_URL ?? "http://localhost:3002";

export async function fetchModels(type: "llm" | "embedding") {
  const res = await fetch(`${API_BASE}/api/models/${type}`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadFiles(
  files: File[],
  embeddingProvider: string,
  embeddingModel: string
) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("embeddingProvider", embeddingProvider);
  formData.append("embeddingModel", embeddingModel);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export function chatStream(
  question: string,
  provider: string,
  model: string,
  onChunk: (text: string) => void,
  onSources: (sources: unknown[]) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, provider, model }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Chat failed" }));
        onError(err.error);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") onChunk(parsed.content);
            else if (parsed.type === "sources") onSources(parsed.sources);
            else if (parsed.type === "error") onError(parsed.error);
          } catch {
            // ignore parse errors
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  return controller;
}

export async function fetchDocumentGraph(documentId?: string) {
  const path = documentId
    ? `${API_BASE}/api/graph/documents/${documentId}`
    : `${API_BASE}/api/graph/documents`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

export async function fetchRelatedDocuments(documentId: string) {
  const res = await fetch(`${API_BASE}/api/graph/documents/${documentId}/related`);
  if (!res.ok) throw new Error("Failed to fetch related documents");
  return res.json();
}

export async function fetchChunkGraph(documentId: string) {
  const res = await fetch(`${API_BASE}/api/graph/documents/${documentId}/chunks`);
  if (!res.ok) throw new Error("Failed to fetch chunk graph");
  return res.json();
}

export async function fetchSchemaGraph(documentId?: string) {
  const params = documentId ? `?documentId=${documentId}` : "";
  const res = await fetch(`${API_BASE}/api/graph/schema${params}`);
  if (!res.ok) throw new Error("Failed to fetch schema graph");
  return res.json();
}

export async function deleteSchemaTable(tableName: string) {
  const res = await fetch(`${API_BASE}/api/graph/schema/tables/${encodeURIComponent(tableName)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete table");
  return res.json();
}

export async function deleteForeignKey(fromTable: string, toTable: string, fromColumn: string, toColumn: string) {
  const res = await fetch(`${API_BASE}/api/graph/schema/foreign-keys`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromTable, toTable, fromColumn, toColumn }),
  });
  if (!res.ok) throw new Error("Failed to delete foreign key");
  return res.json();
}

export async function fetchSchemaComparison() {
  const res = await fetch(`${API_BASE}/api/schema/comparison`);
  if (!res.ok) throw new Error("Failed to fetch schema comparison");
  return res.json();
}

export async function importTables(tableNames: string[]) {
  const res = await fetch(`${API_BASE}/api/schema/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableNames }),
  });
  if (!res.ok) throw new Error("Failed to import tables");
  return res.json();
}

export async function createForeignKey(fk: {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}) {
  const res = await fetch(`${API_BASE}/api/schema/foreign-keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fk),
  });
  if (!res.ok) throw new Error("Failed to create foreign key");
  return res.json();
}

export async function updateForeignKey(data: {
  oldFromTable: string;
  oldFromColumn: string;
  oldToTable: string;
  oldToColumn: string;
  newFromTable: string;
  newFromColumn: string;
  newToTable: string;
  newToColumn: string;
}) {
  const res = await fetch(`${API_BASE}/api/schema/foreign-keys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update foreign key");
  return res.json();
}

export async function syncTables(tableNames: string[]) {
  const res = await fetch(`${API_BASE}/api/schema/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableNames }),
  });
  if (!res.ok) throw new Error("Failed to sync tables");
  return res.json();
}

export async function fetchMssqlForeignKeys() {
  const res = await fetch(`${API_BASE}/api/schema/mssql-foreign-keys`);
  if (!res.ok) throw new Error("Failed to fetch MSSQL foreign keys");
  return res.json();
}

export async function updateTable(tableName: string, updates: {
  displayName?: string;
  description?: string;
  columns?: Array<{
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    description?: string;
  }>;
}) {
  const res = await fetch(`${API_BASE}/api/schema/tables/${encodeURIComponent(tableName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update table");
  return res.json();
}

export async function getDriveAuthUrl() {
  const res = await fetch(`${API_BASE}/api/documents/drive/auth-url`);
  if (!res.ok) throw new Error("Failed to fetch auth URL");
  return res.json(); // Trả về { url: '...' }
}

export async function fetchDriveFiles(folderId?: string, search?: string) {
  const params = new URLSearchParams();
  if (folderId) params.append("folderId", folderId);
  if (search) params.append("search", search);

  const res = await fetch(
    `${API_BASE}/api/documents/drive/files?${params.toString()}`
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    throw new Error("Failed to fetch drive files");
  }
  return res.json();
}

export async function ingestDriveFile(fileId: string, embeddingProvider: string, embeddingModel: string) {
  const res = await fetch(`${API_BASE}/api/documents/drive/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, embeddingProvider, embeddingModel }),
  });
  if (!res.ok) throw new Error("Failed to ingest drive file");
  return res.json();
}
 