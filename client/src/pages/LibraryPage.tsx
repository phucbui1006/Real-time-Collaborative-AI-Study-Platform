// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân
import { useState } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";

export default function LibraryPage() {
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_DOCS[0].id);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const handleUpload = (files: File[], customSubject = "MỚI TẢI LÊN") => {
    const added: DocumentItem[] = files.map((f, i) => {
      const ext = f.name.split(".").pop()?.toUpperCase();
      let fileType: "PDF" | "DOCX" | "PPTX" | "IMG" = "PDF";
      if (ext === "DOCX" || ext === "DOC") fileType = "DOCX";
      else if (ext === "PPTX" || ext === "PPT") fileType = "PPTX";
      else if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext || "")) fileType = "IMG";

      return {
        id: Date.now() + i,
        subject: customSubject,
        title: f.name.replace(/\.[^/.]+$/, ""),
        progress: 0,
        color: "#6366f1",
        icon: fileType === "DOCX" ? "📝" : fileType === "PPTX" ? "📊" : "📄",
        pagesCount: Math.floor(Math.random() * 30) + 10,
        fileSize: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        fileType,
        updatedAt: "Vừa xong",
      };
    });
    setDocs((d) => [...added, ...d]);
    setSelectedId(added[0].id);
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    // Tự động mở AI Chat nếu đang thu gọn khi chọn tài liệu
    if (!isAIChatOpen) setIsAIChatOpen(true);
  };

  const handleDeleteDoc = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) {
      const remaining = docs.filter((d) => d.id !== id);
      if (remaining.length > 0) setSelectedId(remaining[0].id);
    }
  };

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="relative flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-300">
        {/* Cột chính: Kho tài liệu */}
        <DocumentStore
          docs={docs}
          selectedId={selectedId}
          onSelect={handleSelectDoc}
          onDelete={handleDeleteDoc}
          onUpload={handleUpload}
          isAIChatOpen={isAIChatOpen}
        />

        {/* Cột phụ: Trợ lý AI (Slide-over / Collapsible Panel) */}
        <AIChat
          doc={selectedDoc}
          isOpen={isAIChatOpen}
          onOpen={() => setIsAIChatOpen(true)}
          onClose={() => setIsAIChatOpen(false)}
        />
      </div>
    </div>
  );
}
