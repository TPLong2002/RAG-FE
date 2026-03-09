export type LLMProvider = "openai" | "google" | "aistudio";
export type EmbeddingProvider = "openai" | "google";

export interface DocumentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  ownerId: string;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  uploadedAt: string;
}

export interface ChatSource {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export interface ModelOption {
  id: string;
  name: string;
}

export type ModelsMap = Record<string, ModelOption[]>;

export interface GraphNode {
  id: string;
  label: string;
  type: "document" | "chunk" | "table";
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RelatedDocument {
  documentId: string;
  fileName: string;
  score: number;
  connectionCount: number;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  description?: string;
}

export interface ColumnChange {
  columnName: string;
  changeType: 'added' | 'removed' | 'modified' | 'type-changed' | 'nullability-changed' | 'primary-key-changed';
  oldValue?: any;
  newValue?: any;
}

export interface TableDetail {
  name: string;
  displayName: string;
  objectId?: number;
  columns: TableColumn[];
  source: "mssql" | "neo4j";
  oldName?: string;
  columnChanges?: ColumnChange[];
  changeSummary?: string;
  neo4jColumns?: TableColumn[];
}

export interface MssqlForeignKey {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

export interface SchemaComparison {
  newTables: TableDetail[];
  existingTables: TableDetail[];
  changedTables: TableDetail[];
  renamedTables: TableDetail[];
  mssqlForeignKeys: MssqlForeignKey[];
}

export interface SyncResult {
  synced: number;
  errors: string[];
}

export interface ForeignKeyInput {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}
