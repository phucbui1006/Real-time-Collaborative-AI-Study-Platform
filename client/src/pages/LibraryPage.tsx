// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { supabase } from "../services/supabaseClient";

interface SupabaseDoc {
  id: number;
  filename: string;
  original_name?: string;
  subject?: string;
  total_pages?: number;
  file_url?: string;
  created_at?: string;
  pages_content?: string[];
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
    pagesContent: Array.isArray(d.pages_content) ? d.pages_content : [],
  };
}

export default function LibraryPage() {
  const [docs, setDocs] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_DOCS[0].id);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const fetchDocs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabaseDoc);
        setDocs(mapped);
        setSelectedId((prev) => (mapped.some((m: DocumentItem) => m.id === prev) ? prev : mapped[0].id));
        return;
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu từ Supabase, dùng dữ liệu dự phòng:", err);
    }
    setDocs(INITIAL_DOCS);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (files: File[], customSubject = "MỚI TẢI LÊN") => {
    for (const file of files) {
      try {
        const totalPages = Math.max(1, Math.floor(file.size / 50000));
        await supabase.from("documents").insert([
          {
            filename: file.name,
            original_name: file.name,
            subject: customSubject,
            total_pages: totalPages,
            file_url: null,
            pages_content: [
              `Chương 1: Giới thiệu và tổng quan nội dung ${file.name.replace(/\.[^/.]+$/, "")}`,
              `Chương 2: Các khái niệm, định nghĩa và công thức cốt lõi`,
              `Chương 3: Phân tích bài tập mẫu và phương pháp giải nhanh`,
              `Chương 4: Tóm tắt bài học và ngân hàng câu hỏi tự luyện`,
            ],
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Lỗi khi upload tài liệu lên Supabase:", err);
      }
    }
    // Refresh danh sách tài liệu từ Supabase
    await fetchDocs();
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    if (!isAIChatOpen) setIsAIChatOpen(true);
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await supabase.from("documents").delete().eq("id", id);
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (selectedId === id && next.length > 0) {
          setSelectedId(next[0].id);
        }
        return next.length > 0 ? next : INITIAL_DOCS;
      });
    } catch (err) {
      console.error("Lỗi khi xóa tài liệu trên Supabase:", err);
    }
  };

  const currentDoc = docs.find((d) => d.id === selectedId) || docs[0] || null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      <div className={isAIChatOpen ? "lg:col-span-8 min-w-0" : "lg:col-span-12 min-w-0"}>
        <DocumentStore
          docs={docs}
          selectedId={selectedId}
          onSelect={handleSelectDoc}
          onDelete={handleDeleteDoc}
          onUpload={handleUpload}
          isAIChatOpen={isAIChatOpen}
        />
      </div>

      <AIChat
        doc={currentDoc}
        isOpen={isAIChatOpen}
        onOpen={() => setIsAIChatOpen(true)}
        onClose={() => setIsAIChatOpen(false)}
      />
    </div>
  );
}
