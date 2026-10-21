// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback } from "react";
import { DocumentItem } from "../services/aiService";
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
  owner_user_id?: string | null;
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
    isPublic: !d.owner_user_id,
    ownerUserId: d.owner_user_id || null,
  };
}

// Cache theo từng userId để lưu danh sách tài liệu độc lập giữa các tài khoản và các lần chuyển tab
const userDocsCache = new Map<string, DocumentItem[]>();

interface LibraryPageProps {
  userId?: string;
}

export default function LibraryPage({ userId }: LibraryPageProps) {
  const currentCache = userId ? userDocsCache.get(userId) || null : null;
  const [docs, setDocs] = useState<DocumentItem[]>(currentCache || []);
  const [selectedId, setSelectedId] = useState<number | null>(
    currentCache && currentCache.length > 0 ? currentCache[0].id : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!currentCache);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const fetchDocs = useCallback(async () => {
    try {
      const activeCache = userId ? userDocsCache.get(userId) : null;
      if (!activeCache) {
        setIsLoading(true);
      }

      // 1. Truy vấn tài liệu riêng của user + các tài liệu Public mẫu chung (owner_user_id IS NULL)
      let query = supabase.from("documents").select("*");
      if (userId) {
        query = query.or(`owner_user_id.eq.${userId},owner_user_id.is.null`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      // Nếu cột owner_user_id chưa có trong database Supabase (trước khi chạy script SQL)
      if (error && (error.message.includes("owner_user_id") || error.code === "42703")) {
        console.warn("Cột owner_user_id chưa được kích hoạt trên Supabase. Sử dụng lưu trữ cục bộ cho tài khoản:", userId);
        const localKey = `peermind_docs_${userId || "guest"}`;
        const stored = localStorage.getItem(localKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (userId) userDocsCache.set(userId, parsed);
            setDocs(parsed);
            setSelectedId((prev) => (prev && parsed.some((m: DocumentItem) => m.id === prev) ? prev : (parsed[0]?.id ?? null)));
            return;
          } catch {}
        }
        setDocs([]);
        return;
      }

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapSupabaseDoc);
        if (userId) userDocsCache.set(userId, mapped);
        setDocs(mapped);
        setSelectedId((prev) =>
          prev && mapped.some((m: DocumentItem) => m.id === prev) ? prev : (mapped[0]?.id ?? null)
        );
        return;
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu từ Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (files: File[], customSubject = "MỚI TẢI LÊN") => {
    for (const file of files) {
      try {
        const totalPages = Math.max(1, Math.floor(file.size / 50000));
        const docPayload: any = {
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
        };

        if (userId) {
          docPayload.owner_user_id = userId;
        }

        const { error: insErr } = await supabase.from("documents").insert([docPayload]);

        // Nếu cột owner_user_id chưa có trên DB, fallback lưu an toàn vào local
        if (insErr && (insErr.message.includes("owner_user_id") || insErr.code === "42703")) {
          delete docPayload.owner_user_id;
          await supabase.from("documents").insert([docPayload]);
          const localKey = `peermind_docs_${userId || "guest"}`;
          const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
          currentLocal.unshift({
            id: Date.now(),
            subject: customSubject,
            title: file.name.replace(/\.[^/.]+$/, ""),
            progress: 0,
            color: "#0ea5e9",
            icon: "📄",
            pagesCount: totalPages,
            fileSize: "2.4 MB",
            fileType: "PDF",
            updatedAt: "Vừa xong",
            pagesContent: docPayload.pages_content,
          });
          localStorage.setItem(localKey, JSON.stringify(currentLocal));
        }
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
      const docToDelete = docs.find((d) => d.id === id);
      // Nếu là tài liệu cá nhân thì xóa trên DB, tài liệu mẫu chung chỉ ẩn ở phía cá nhân
      if (!docToDelete?.isPublic) {
        await supabase.from("documents").delete().eq("id", id);
      }
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (userId) userDocsCache.set(userId, next);
        if (selectedId === id) {
          setSelectedId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
      if (userId) {
        const localKey = `peermind_docs_${userId}`;
        const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
        localStorage.setItem(localKey, JSON.stringify(currentLocal.filter((d: any) => d.id !== id)));
      }
    } catch (err) {
      console.error("Lỗi khi xóa tài liệu trên Supabase:", err);
    }
  };

  const currentDoc = (selectedId !== null ? docs.find((d) => d.id === selectedId) : null) || docs[0] || null;

  return (
    <div className="relative min-w-0">
      <div className="w-full min-w-0">
        <DocumentStore
          docs={docs}
          selectedId={selectedId}
          onSelect={handleSelectDoc}
          onDelete={handleDeleteDoc}
          onUpload={handleUpload}
          isAIChatOpen={false}
          isLoading={isLoading}
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
