import { useState, useEffect } from "react";
import { fetchDriveFiles, getDriveAuthUrl } from "../lib/api";

interface Props {
  onSelect: (fileId: string) => void;
  onClose: () => void;
}

export default function GoogleDriveModal({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("root");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Thêm state search

  const loadFiles = async (folderId: string, search?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDriveFiles(folderId, search);
      setFiles(data.files);
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        const { url } = await getDriveAuthUrl();
        window.open(url, "_blank");
        setError("Vui lòng đăng nhập Google ở tab mới và thử lại.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentFolder, searchQuery);
  }, [currentFolder]);

  // Hàm xử lý search khi nhấn Enter hoặc nhấn nút
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles("root", searchQuery);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Mở rộng max-w-5xl để modal to hơn */}
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header có thêm thanh Search */}
        <div className="p-6 border-b flex flex-col md:flex-row items-center justify-between bg-gray-50 gap-4">
          <div className="flex items-center gap-3 min-w-fit">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
              className="w-8 h-8"
            />
            <h3 className="font-bold text-xl text-gray-800">Google Drive</h3>
          </div>

          {/* Ô Search mới */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-lg flex items-center bg-white border rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all"
          >
            <span className="text-gray-400 mr-2">🔍</span>
            <input
              type="text"
              placeholder="Tìm tên file hoặc folder..."
              className="w-full outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
            >
              Tìm
            </button>
          </form>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {error && (
            <div className="p-10 text-center">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button
                onClick={() => loadFiles(currentFolder)}
                className="bg-blue-100 text-blue-600 px-4 py-2 rounded-xl font-medium"
              >
                Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải dữ liệu từ Drive...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Nút Quay lại */}
              {(currentFolder !== "root" || searchQuery) && (
                <div
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentFolder("root");
                  }}
                  className="col-span-full p-3 mb-2 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer text-blue-600 text-sm font-bold flex items-center gap-2"
                >
                  ⬅{" "}
                  {searchQuery
                    ? "Thoát chế độ tìm kiếm"
                    : "Quay lại Drive của tôi"}
                </div>
              )}

              {files.map((file) => {
                const isFolder =
                  file.mimeType === "application/vnd.google-apps.folder";
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all group"
                    onClick={() => {
                      if (isFolder) {
                        setSearchQuery(""); // Xóa search khi vào folder mới
                        setCurrentFolder(file.id);
                      } else {
                        onSelect(file.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className="text-3xl flex-shrink-0">
                        {isFolder ? "📁" : getEmoji(file.mimeType)}
                      </span>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-700 truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">
                          {isFolder
                            ? "Thư mục"
                            : file.mimeType
                                .split(".")
                                .pop()
                                ?.replace("vnd.google-apps.", "")}
                        </p>
                      </div>
                    </div>
                    {!isFolder && (
                      <button className="flex-shrink-0 text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        CHỌN
                      </button>
                    )}
                  </div>
                );
              })}

              {!loading && files.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                  Không tìm thấy kết quả nào.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hàm bổ sung để hiển thị Emoji cho tất cả các loại file
function getEmoji(mimeType: string) {
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📘";
  if (mimeType.includes("spreadsheet") || mimeType.includes("sheet"))
    return "📗";
  if (mimeType.includes("presentation")) return "📙";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("video")) return "🎬";
  if (mimeType.includes("zip")) return "📦";
  return "📄"; // File khác
}
 