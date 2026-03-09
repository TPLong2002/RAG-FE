import { useState, useRef } from "react";
import { uploadFiles, ingestDriveFile } from "../../lib/api"; 
import GoogleDriveModal from "../../pages/GoogleDriveModal"; 
import Swal from "sweetalert2";

interface Props {
  embeddingProvider: string;
  embeddingModel: string;
  onUploadComplete: () => void;
}

const ACCEPTED = ".pdf,.docx,.doc,.csv,.txt";

export default function FileUpload({
  embeddingProvider,
  embeddingModel,
  onUploadComplete,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showDrive, setShowDrive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // GIỮ NGUYÊN HÀM NÀY CỦA BẠN
  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError("");
    }
  };

  // GIỮ NGUYÊN HÀM NÀY VÀ THÊM SWAL LOADING
  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setError("");

    Swal.fire({
      title: 'Đang tải lên...',
      text: 'Vui lòng chờ trong giây lát',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      await uploadFiles(files, embeddingProvider, embeddingModel);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";

      Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: 'Tài liệu đã được tải lên và xử lý.',
        timer: 2000,
        showConfirmButton: false
      });

      onUploadComplete();
    } catch (err) {
      setError((err as Error).message);
      Swal.fire({ icon: 'error', title: 'Lỗi', text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  // HÀM XỬ LÝ CHỌN TỪ DRIVE - THÊM SWAL LOADING CHI TIẾT
  const handleDriveSelect = async (fileId: string) => {
    setShowDrive(false);
    setUploading(true);

    Swal.fire({
      title: "Đang xử lý...",
      html: "Vui lòng chờ tải file lên...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const result = await ingestDriveFile(
        fileId,
        embeddingProvider,
        embeddingModel
      );
      console.log("🚀 ~ handleDriveSelect ~ result:", result)

      const fileName = result.document.fileName;

      if (result.isExisting) {
        Swal.fire({
          icon: "info",
          title: "Tài liệu đã tồn tại",
          text: `Nội dung "${fileName}" đã tồn tại.`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          text: `Thêm tài liệu ${fileName} thành công`,
          timer: 3000,
          showConfirmButton: false,
        });
      }

      onUploadComplete();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: err.message || "Không thể xử lý tài liệu này.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative border border-border rounded-xl p-4 bg-surface shadow-sm">
      {/* Lớp phủ Loading mờ khi đang xử lý */}
      {uploading && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-primary">Đang xử lý...</span>
           </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* Input chọn file từ máy */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={handleSelect}
          className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-primary-text file:text-sm file:cursor-pointer hover:file:bg-primary-hover"
        />

        <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>

        {/* Nút mở Google Drive */}
        <button
          type="button"
          onClick={() => setShowDrive(true)}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
            className="w-4 h-4"
          />
          Google Drive
        </button>

        <button
          onClick={handleUpload}
          disabled={!files.length || uploading}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-text text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors ml-auto"
        >
          {uploading ? "Processing..." : "Upload"}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-2 text-xs text-muted">
          Đã chọn: {files.map((f) => f.name).join(", ")}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {showDrive && (
        <GoogleDriveModal
          onSelect={handleDriveSelect}
          onClose={() => setShowDrive(false)}
        />
      )}
    </div>
  );
}