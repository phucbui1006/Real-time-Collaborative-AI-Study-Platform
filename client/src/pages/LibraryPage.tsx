// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { supabase } from "../services/supabaseClient";
import { isValidUUID } from "../utils";

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

function isTestDoc(item: { original_name?: string; filename?: string; title?: string; subject?: string }): boolean {
  const name = (item.original_name || item.filename || item.title || "").toLowerCase().trim();
  const subj = (item.subject || "").toLowerCase().trim();
  return name === "test" || name.startsWith("test.") || name.startsWith("test ") || subj === "test";
}

function mapSupabaseDoc(d: SupabaseDoc, index: number): DocumentItem {
  const filename = d.original_name || d.filename || `Tài liệu ${d.id}`;
  const ext = filename.split(".").pop()?.toUpperCase() || "PDF";
  let fileType: "PDF" | "DOCX" | "PPTX" | "IMG" = "PDF";
  if (ext === "DOCX" || ext === "DOC") fileType = "DOCX";
  else if (ext === "PPTX" || ext === "PPT") fileType = "PPTX";
  else if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext)) fileType = "IMG";

  const colors = ["#ffda00", "#91d8ec", "#ffbac4", "#16ab59", "#ffda00"];
  const color = colors[index % colors.length];

  // Tính tiến độ ổn định, không thay đổi ngẫu nhiên giữa các lần tải lại
  const progressKey = `peermind_doc_progress_${d.id}`;
  let progress = 65;
  try {
    const stored = localStorage.getItem(progressKey);
    if (stored !== null) {
      progress = parseInt(stored, 10);
    } else {
      progress = 35 + ((Math.abs(d.id) * 19 + 7) % 55);
      localStorage.setItem(progressKey, progress.toString());
    }
  } catch {
    progress = 35 + ((Math.abs(d.id) * 19 + 7) % 55);
  }

  // Dung lượng file đa dạng thực tế dựa trên số trang và id
  const pagesCount = d.total_pages || (16 + (Math.abs(d.id) % 28));
  const fileSizeMb = (pagesCount * 0.11 + 1.2 + (Math.abs(d.id) % 5) * 0.5).toFixed(1);
  const fileSize = `${fileSizeMb} MB`;

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
    progress,
    color,
    icon: fileType === "DOCX" ? "📝" : fileType === "PPTX" ? "📊" : "📄",
    pagesCount,
    fileSize,
    fileType,
    updatedAt: formattedDate,
    pagesContent: Array.isArray(d.pages_content) ? d.pages_content : [],
    isPublic: !d.owner_user_id,
    ownerUserId: d.owner_user_id || null,
  };
}

// Cache theo từng userId để lưu danh sách tài liệu độc lập giữa các tài khoản và các lần chuyển tab
const userDocsCache = new Map<string, DocumentItem[]>();

/**
 * Xóa sạch toàn bộ cache và state dữ liệu tài liệu người dùng khi đăng xuất
 */
export function clearAllUserState() {
  userDocsCache.clear();
  if (typeof window !== "undefined") {
    try {
      const keys = [
        "peermind_docs_guest",
        "peermind_docs_guest-user-001",
        "peermind_rooms_guest",
        "peermind_rooms_guest-user-001",
        "peermind_exam_sets_guest",
        "peermind_exam_sets_guest-user-001",
        "peermind_exam_history_guest",
        "peermind_exam_history_guest-user-001",
      ];
      keys.forEach((k) => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    } catch (e) {
      console.warn("Lỗi khi xóa state người dùng:", e);
    }
  }
}

interface LibraryPageProps {
  userId?: string;
  userName?: string;
}

export default function LibraryPage({ userId, userName }: LibraryPageProps) {
  const currentCache = userId ? userDocsCache.get(userId) || null : null;
  const [docs, setDocs] = useState<DocumentItem[]>(currentCache || INITIAL_DOCS);
  const [selectedId, setSelectedId] = useState<number | null>(
    (currentCache && currentCache.length > 0 ? currentCache[0].id : null) || INITIAL_DOCS[0]?.id || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!currentCache);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);

  const fetchDocs = useCallback(async () => {
    try {
      const activeCache = userId ? userDocsCache.get(userId) : null;
      if (!activeCache) {
        setIsLoading(true);
      }

      // 1. Truy vấn tài liệu Supabase:
      // - Nếu là user thật đăng nhập bằng Supabase Auth (UUID hợp lệ): Lấy tài liệu của user + tài liệu Public (owner_user_id IS NULL)
      // - Nếu là tài khoản Demo / Khách (không phải UUID): Chỉ truy vấn tài liệu Public hệ thống (owner_user_id IS NULL)
      let query = supabase.from("documents").select("*");
      if (isValidUUID(userId)) {
        query = query.or(`owner_user_id.eq.${userId},owner_user_id.is.null`);
      } else {
        query = query.is("owner_user_id", null);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      // Nếu có lỗi từ Supabase (ví dụ offline hoặc chưa cấu hình)
      if (error) {
        console.warn("Lỗi tải tài liệu từ Supabase:", error);
        const localKey = `peermind_docs_${userId || "guest"}`;
        const stored = localStorage.getItem(localKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (userId) userDocsCache.set(userId, parsed);
              setDocs(parsed);
              setSelectedId((prev) => (prev && parsed.some((m: DocumentItem) => m.id === prev) ? prev : (parsed[0]?.id ?? null)));
              return;
            }
          } catch {}
        }
        // Fallback sang INITIAL_DOCS
        setDocs(INITIAL_DOCS);
        setSelectedId((prev) => (prev && INITIAL_DOCS.some((m) => m.id === prev) ? prev : (INITIAL_DOCS[0]?.id ?? null)));
        return;
      }

      if (!error && Array.isArray(data)) {
        // Loại bỏ tài liệu test / dữ liệu thử
        const cleanData = data.filter((d) => !isTestDoc(d));
        let mapped = cleanData.map(mapSupabaseDoc);

        // Đối với tài khoản Demo/Khách, hợp nhất thêm các tài liệu do khách upload lưu cục bộ
        if (!isValidUUID(userId)) {
          const localKey = `peermind_docs_${userId || "guest"}`;
          const stored = localStorage.getItem(localKey);
          if (stored) {
            try {
              const localDocs = JSON.parse(stored);
              if (Array.isArray(localDocs) && localDocs.length > 0) {
                const cleanLocal = localDocs.filter((d: any) => !isTestDoc(d));
                const localIds = new Set(cleanLocal.map((d: DocumentItem) => d.id));
                mapped = [...cleanLocal, ...mapped.filter((d) => !localIds.has(d.id))];
              }
            } catch {}
          }
        }

        // Nếu database chưa có tài liệu nào, fallback sang INITIAL_DOCS
        if (mapped.length === 0) {
          mapped = INITIAL_DOCS;
        }

        if (userId) userDocsCache.set(userId, mapped);
        setDocs(mapped);
        setSelectedId((prev) =>
          prev && mapped.some((m: DocumentItem) => m.id === prev) ? prev : (mapped[0]?.id ?? null)
        );
        return;
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu từ Supabase:", err);
      setDocs(INITIAL_DOCS);
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

        // Nếu là user thật có UUID thì lưu lên Supabase DB
        if (isValidUUID(userId)) {
          docPayload.owner_user_id = userId;
          await supabase.from("documents").insert([docPayload]);
        } else {
          // Lưu vào localStorage cho tài khoản Demo / Khách trải nghiệm
          const localKey = `peermind_docs_${userId || "guest"}`;
          const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
          currentLocal.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            subject: customSubject,
            title: file.name.replace(/\.[^/.]+$/, ""),
            progress: 0,
            color: "#0ea5e9",
            icon: "📄",
            pagesCount: totalPages,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            fileType: "PDF",
            updatedAt: "Vừa xong",
            pagesContent: docPayload.pages_content,
            isPublic: false,
            ownerUserId: userId || null,
          });
          localStorage.setItem(localKey, JSON.stringify(currentLocal));
        }
      } catch (err) {
        console.error("Lỗi khi upload tài liệu:", err);
      }
    }
    // Refresh danh sách tài liệu
    await fetchDocs();
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    if (!isAIChatOpen) setIsAIChatOpen(true);
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      const docToDelete = docs.find((d) => d.id === id);
      // Chỉ gửi lệnh DELETE lên Supabase nếu là user thật sở hữu tài liệu này
      if (isValidUUID(userId) && docToDelete?.ownerUserId === userId && !docToDelete?.isPublic) {
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
      // Nếu có lưu trong localStorage của khách thì xóa khỏi localStorage
      const localKey = `peermind_docs_${userId || "guest"}`;
      const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
      if (Array.isArray(currentLocal)) {
        localStorage.setItem(localKey, JSON.stringify(currentLocal.filter((d: any) => d.id !== id)));
      }
    } catch (err) {
      console.error("Lỗi khi xóa tài liệu:", err);
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
          userName={userName}
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
