// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase
import { useState, useEffect, useCallback } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { getDocuments, uploadDocument, deleteDocument } from "../services/api";

interface SupabaseDoc {
  id: number;
  filename: string;
  original_name?: string;
  subject?: string;
  total_pages?: number;
  file_url?: string;
  created_at?: string;
}

function mapSupabaseDoc(d: SupabaseDoc, index: number): DocumentItem {
  const filename = d.original_name || d.filename || `Tài liệu ${d.id}`;
  const ext = filename.split(".").pop()?.toUpperCase() || "PDF";
  let fileType: "PDF" | "DOCX" | "PPTX" | "IMG" = "PDF";
  if (ext === "DOCX" || ext === "DOC") fileType = "DOCX";
  else if (ext === "PPTX" || ext === "PPT") fileType = "PPTX";
  else if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext)) fileType = "IMG";

  const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"];
  const color = colors[index % colors.length];

  let formattedDate = "Vừa xong";
  if (d.created_at) {
    try {
      const date = new Date(d.created_at);
      formattedDate = date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      formattedDate = "Gần đây";
    }
  }

  return {
    id: d.id,
    subject: d.subject || "CHUNG",
    title: filename.replace(/\.[^/.]+$/, ""),
    progress: Math.floor(Math.random() * 50) + 40,
    color,
    icon: fileType === "DOCX" ? "📝" : fileType === "PPTX" ? "📊" : "📄",
    pagesCount: d.total_pages || 15,
    fileSize: "2.4 MB",
    fileType,
    updatedAt: formattedDate,
  };
}

export default function LibraryPage() {
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_DOCS[0].id);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await getDocuments();
      if (res.data?.success && Array.isArray(res.data.documents) && res.data.documents.length > 0) {
        const mapped = res.data.documents.map(mapSupabaseDoc);
        setDocs(mapped);
        setSelectedId((prev) => (mapped.some((m: DocumentItem) => m.id === prev) ? prev : mapped[0].id));
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu từ Supabase, dùng dữ liệu dự phòng:", err);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (files: File[], customSubject = "MỚI TẢI LÊN") => {
    for (const file of files) {
      try {
        await uploadDocument(file, customSubject);
      } catch (err) {
        console.error("Lỗi khi upload tài liệu:", err);
      }
    }
    // Refresh danh sách tài liệu từ Supabase
    await fetchDocs();
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    // Tự động mở AI Chat nếu đang thu gọn khi chọn tài liệu
    if (!isAIChatOpen) setIsAIChatOpen(true);
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await deleteDocument(id);
    } catch (err) {
      console.warn("Lỗi khi xóa tài liệu khỏi server:", err);
    }
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
