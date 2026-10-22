// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { DocumentStudioView } from "../components/documents/DocumentStudioView";
import { supabase } from "../services/supabaseClient";
import { isValidUUID } from "../utils";
import { extractDocumentContent } from "../services/pdfService";

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
  const isRealUser = isValidUUID(userId);
  const currentCache = userId ? userDocsCache.get(userId) || null : null;

  // Với tài khoản thật: khởi tạo rỗng (không nạp tài liệu mẫu demo)
  // Với tài khoản demo/khách: nạp INITIAL_DOCS mẫu
  const [docs, setDocs] = useState<DocumentItem[]>(() => {
    if (isRealUser) return currentCache || [];
    return currentCache || INITIAL_DOCS;
  });

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (isRealUser) {
      return currentCache && currentCache.length > 0 ? currentCache[0].id : null;
    }
    return (currentCache && currentCache.length > 0 ? currentCache[0].id : null) || INITIAL_DOCS[0]?.id || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!currentCache);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [studioDoc, setStudioDoc] = useState<DocumentItem | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const activeCache = userId ? userDocsCache.get(userId) : null;
      if (!activeCache) {
        setIsLoading(true);
      }

      // 1. Truy vấn tài liệu Supabase:
      // - Nếu là user thật: CHỈ lấy tài liệu do chính user đó tải lên (owner_user_id = userId), TUYỆT ĐỐI KHÔNG lấy tài liệu mẫu (owner_user_id IS NULL)
      // - Nếu là tài khoản Demo / Khách: lấy tài liệu mẫu hệ thống (owner_user_id IS NULL)
      let query = supabase.from("documents").select("*");
      if (isValidUUID(userId)) {
        query = query.eq("owner_user_id", userId);
      } else {
        query = query.is("owner_user_id", null);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      // Nếu có lỗi từ Supabase
      if (error) {
        console.warn("Lỗi tải tài liệu từ Supabase:", error);
        if (!isValidUUID(userId)) {
          const localKey = `peermind_docs_${userId || "guest"}`;
          const stored = localStorage.getItem(localKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setDocs(parsed);
                setSelectedId((prev) => (prev && parsed.some((m: DocumentItem) => m.id === prev) ? prev : (parsed[0]?.id ?? null)));
                return;
              }
            } catch {}
          }
          setDocs(INITIAL_DOCS);
          setSelectedId((prev) => (prev && INITIAL_DOCS.some((m) => m.id === prev) ? prev : (INITIAL_DOCS[0]?.id ?? null)));
        } else {
          setDocs([]);
          setSelectedId(null);
        }
        return;
      }

      if (!error && Array.isArray(data)) {
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
          if (mapped.length === 0) {
            mapped = INITIAL_DOCS;
          }
        }
        // Với user thật: nếu mapped rỗng ([]), giữ nguyên rỗng, KHÔNG nạp INITIAL_DOCS!

        if (userId) userDocsCache.set(userId, mapped);
        setDocs(mapped);
        setSelectedId((prev) =>
          prev && mapped.some((m: DocumentItem) => m.id === prev) ? prev : (mapped[0]?.id ?? null)
        );
        return;
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu từ Supabase:", err);
      if (isValidUUID(userId)) {
        setDocs([]);
        setSelectedId(null);
      } else {
        setDocs(INITIAL_DOCS);
        setSelectedId(INITIAL_DOCS[0]?.id ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (files: File[], customSubject = "MỚI TẢI LÊN"): Promise<void> => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB theo chuẩn Security.md mục 4
    const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".txt", ".md"];

    for (const file of files) {
      // 1. Kiểm tra dung lượng file (tối đa 20MB)
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File "${file.name}" dung lượng ${(file.size / (1024 * 1024)).toFixed(1)} MB vượt quá giới hạn cho phép (tối đa 20 MB).`
        );
      }

      // 2. Làm sạch tên file (chống path traversal, ký tự điều khiển, XSS)
      const cleanName = file.name
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\.\.+/g, ".")
        .trim()
        .slice(0, 120);

      const ext = cleanName.substring(cleanName.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(
          `Định dạng file "${ext}" không được hỗ trợ. Vui lòng chọn file PDF, DOCX hoặc PPTX.`
        );
      }

      // 3. Tạo ngay ô tài liệu đang load tại thư viện (theo đúng yêu cầu của người dùng)
      const tempId = -Date.now() - Math.floor(Math.random() * 1000);
      const tempDoc: DocumentItem = {
        id: tempId,
        subject: customSubject,
        title: cleanName.replace(/\.[^/.]+$/, ""),
        color: "#0ea5e9",
        icon: ext === ".docx" ? "📝" : ext === ".pptx" ? "📊" : "📄",
        pagesCount: 0,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        fileType: ext === ".docx" ? "DOCX" : ext === ".pptx" ? "PPTX" : "PDF",
        updatedAt: "Đang bóc tách...",
        pagesContent: [],
        isPublic: false,
        ownerUserId: userId || null,
        isUploading: true,
      };

      setDocs((prev) => [tempDoc, ...prev]);

      // 4. Tiến hành bóc tách và lưu trữ trong nền (hoàn toàn không chặn UI để người dùng thoải mái chuyển tab)
      (async () => {
        try {
          const extracted = await extractDocumentContent(file);

          const docPayload: any = {
            filename: cleanName,
            original_name: cleanName,
            subject: customSubject,
            total_pages: extracted.totalPages,
            file_url: null,
            pages_content: extracted.pages,
            created_at: new Date().toISOString(),
          };

          if (isValidUUID(userId)) {
            docPayload.owner_user_id = userId;
            const { error: insertError } = await supabase.from("documents").insert([docPayload]);
            if (insertError) {
              throw new Error(`Lỗi lưu vào CSDL: ${insertError.message}`);
            }
          } else {
            const localKey = `peermind_docs_${userId || "guest"}`;
            const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
            currentLocal.unshift({
              id: Date.now() + Math.floor(Math.random() * 1000),
              subject: customSubject,
              title: cleanName.replace(/\.[^/.]+$/, ""),
              color: "#0ea5e9",
              icon: ext === ".docx" ? "📝" : ext === ".pptx" ? "📊" : "📄",
              pagesCount: extracted.totalPages,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              fileType: ext === ".docx" ? "DOCX" : ext === ".pptx" ? "PPTX" : "PDF",
              updatedAt: "Vừa xong",
              pagesContent: extracted.pages,
              isPublic: false,
              ownerUserId: userId || null,
            });
            localStorage.setItem(localKey, JSON.stringify(currentLocal));
          }

          // Refresh lại dữ liệu thực tế từ DB để thay thế thẻ placeholder
          await fetchDocs();
        } catch (err: any) {
          console.error("Lỗi khi bóc tách tài liệu nền:", err);
          setDocs((prev) =>
            prev.map((d) =>
              d.id === tempId
                ? {
                    ...d,
                    isUploading: false,
                    uploadError: err.message || "Không thể bóc tách nội dung tài liệu này",
                  }
                : d
            )
          );
        }
      })();
    }
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    const target = docs.find((d) => d.id === id);
    if (target) {
      setStudioDoc(target);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      if (id < 0) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        return;
      }
      // Chỉ gửi lệnh DELETE lên Supabase nếu là user thật sở hữu tài liệu này
      if (isValidUUID(userId)) {
        await supabase.from("documents").delete().eq("id", id).eq("owner_user_id", userId);
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

  if (studioDoc) {
    return (
      <DocumentStudioView
        doc={studioDoc}
        onBack={() => setStudioDoc(null)}
        userId={userId}
        userName={userName}
        onUpdateDoc={(updated) => {
          setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          setStudioDoc(updated);
        }}
      />
    );
  }

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
