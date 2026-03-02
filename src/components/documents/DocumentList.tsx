import { deleteDocument } from "../../lib/api";
import type { DocumentMeta } from "../../types";

interface Props {
  documents: DocumentMeta[];
  loading: boolean;
  onDelete: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ documents, loading, onDelete }: Props) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document and all its chunks?")) return;
    try {
      await deleteDocument(id);
      onDelete();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading...</div>;
  }

  if (documents.length === 0) {
    return <div className="text-center py-8 text-muted">No documents uploaded yet</div>;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface">
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-sm font-medium">File</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Size</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Chunks</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Embedding</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Uploaded</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border hover:bg-surface-hover">
              <td className="px-4 py-3 text-sm">{doc.fileName}</td>
              <td className="px-4 py-3 text-sm uppercase">{doc.fileType}</td>
              <td className="px-4 py-3 text-sm">{formatSize(doc.fileSize)}</td>
              <td className="px-4 py-3 text-sm">{doc.totalChunks}</td>
              <td className="px-4 py-3 text-sm">{doc.embeddingModel}</td>
              <td className="px-4 py-3 text-sm">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-sm">
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
