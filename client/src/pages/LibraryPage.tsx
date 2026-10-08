// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân
import { useState } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";

export default function LibraryPage() {
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_DOCS[0].id);

  const handleUpload = (files: File[]) => {
    const added: DocumentItem[] = files.map((f, i) => ({
      id: Date.now() + i,
      subject: "MỚI TẢI LÊN",
      title: f.name,
      progress: 0,
      color: "#14b8a6",
      icon: "📄",
    }));
    setDocs((d) => [...added, ...d]);
    setSelectedId(added[0].id);
  };

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
      <DocumentStore docs={docs} selectedId={selectedId} onSelect={setSelectedId} onUpload={handleUpload} />
      <AIChat doc={selectedDoc} />
    </div>
  );
}
