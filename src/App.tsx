import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatWindow from "./components/chat/ChatWindow";
import DocumentsPage from "./pages/DocumentsPage";
import GraphPage from "./pages/GraphPage";
import ForeignKeysPage from "./pages/ForeignKeysPage";
import ImportPage from "./pages/ImportPage";

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
        isActive ? "bg-surface-hover text-gray-900" : "text-gray-600 hover:bg-surface-hover hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold">RAG Chatbot</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem
            to="/"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
            label="Chat"
          />
          <NavItem
            to="/documents"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label="Documents"
          />
          <NavItem
            to="/graph"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            }
            label="Graph"
          />
          <NavItem
            to="/foreignkeys"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            label="Foreign Keys"
          />
          <NavItem
            to="/import"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }
            label="Import"
          />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<ChatWindow />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/foreignkeys" element={<ForeignKeysPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
