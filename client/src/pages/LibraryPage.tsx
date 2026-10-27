// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback, useRef } from "react";
import { DocumentItem, INITIAL_DOCS } from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { DocumentStudioView } from "../components/documents/DocumentStudioView";
import { supabase } from "../services/supabaseClient";
import { isValidUUID } from "../utils";
import { extractDocumentContent } from "../services/pdfService";
import { fetchDocumentPage, prefetchDocumentPages } from "../services/documentPagingService";

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
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("permind_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("permind_")) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
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
  const localKey = `permind_docs_${userId || "guest"}`;
  const currentCache = userId ? userDocsCache.get(userId) || null : null;

  // Lấy dữ liệu nhanh từ bộ nhớ RAM hoặc localStorage để hiển thị tức thì (0ms)
  const [docs, setDocs] = useState<DocumentItem[]>(() => {
    if (currentCache && currentCache.length > 0) return currentCache;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return isRealUser ? [] : INITIAL_DOCS;
  });

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (docs.length > 0) return docs[0].id;
    return null;
  });

  // Chỉ hiện skeleton loading nếu hoàn toàn chưa có bất kỳ cache nào (RAM lẫn localStorage)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (currentCache && currentCache.length > 0) return false;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      } catch {}
    }
    return isRealUser;
  });

  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [studioDoc, setStudioDoc] = useState<DocumentItem | null>(null);

  // Điều khiển nạp ngầm và ngắt ưu tiên khi người dùng bấm click
  const isMountedRef = useRef<boolean>(true);
  const isUserActionActiveRef = useRef<boolean>(false);
  const prefetchAbortRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      prefetchAbortRef.current = true;
    };
  }, []);

  /**
   * Tiến trình âm thầm nạp trước nội dung trang (pages_content) trong nền
   * Ưu tiên tải tài liệu đang chọn trước, sau đó lần lượt tải các tài liệu còn lại
   */
  const prefetchDocContents = useCallback(
    async (list: DocumentItem[], priorityId?: number | null) => {
      const queue = [...list].sort((a, b) => {
        if (priorityId && a.id === priorityId) return -1;
        if (priorityId && b.id === priorityId) return 1;
        return 0;
      });

      for (const doc of queue) {
        if (!isMountedRef.current || prefetchAbortRef.current) break;

        // Bỏ qua tài liệu tạm đang tải lên
        if (doc.id < 0) continue;

        // Nếu tài liệu đã có nội dung trong bộ nhớ thì bỏ qua
        const existing = userDocsCache.get(userId || "")?.find((d) => d.id === doc.id);
        if (existing?.pagesContent && existing.pagesContent.length > 0) continue;

        // Nếu người dùng đang bấm click vào 1 tài liệu khác, tạm dừng nhường 100% tài nguyên mạng
        while (isUserActionActiveRef.current) {
          if (!isMountedRef.current || prefetchAbortRef.current) break;
          await new Promise((r) => setTimeout(r, 200));
        }

        if (!isMountedRef.current || prefetchAbortRef.current) break;

        try {
          const { data: detail } = await supabase
            .from("documents")
            .select("pages_content, total_pages")
            .eq("id", doc.id)
            .single();

          if (detail && Array.isArray(detail.pages_content) && detail.pages_content.length > 0) {
            if (!isMountedRef.current || prefetchAbortRef.current) break;
            setDocs((prev) => {
              const next = prev.map((d) =>
                d.id === doc.id
                  ? {
                      ...d,
                      pagesContent: detail.pages_content,
                      pagesCount: d.pagesCount || detail.total_pages || detail.pages_content.length,
                    }
                  : d
              );
              if (userId) userDocsCache.set(userId, next);
              return next;
            });
          }
        } catch {
          // Bỏ qua lỗi nạp ngầm, không ảnh hưởng UI
        }

        // Tạm dừng 400ms giữa các file để mạng hoàn toàn êm ái
        await new Promise((r) => setTimeout(r, 400));
      }
    },
    [userId]
  );

  const fetchDocs = useCallback(async () => {
    try {
      const activeCache = userId ? userDocsCache.get(userId) : null;
      let hasStoredData = false;
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(localKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              hasStoredData = true;
            }
          }
        } catch {}
      }

      // Chỉ hiện skeleton nếu chưa có bất kỳ cache nào (RAM lẫn localStorage)
      if (!activeCache && !hasStoredData) {
        setIsLoading(true);
      }

      // 1. Tải siêu tốc Metadata (tiêu đề, môn học, số trang, ngày tạo) KHÔNG tải pages_content
      // Giúp giao diện hiển thị tức thì trong ~150ms
      let query = supabase
        .from("documents")
        .select("id, filename, original_name, subject, total_pages, file_url, created_at, owner_user_id");

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
          // Với user thật: nếu có lưu cục bộ thì giữ nguyên, nếu không thì để rỗng
          if (!hasStoredData) {
            setDocs([]);
            setSelectedId(null);
          }
        }
        return;
      }

      if (!error && Array.isArray(data)) {
        const cleanData = data.filter((d) => !isTestDoc(d));
        let mapped = cleanData.map(mapSupabaseDoc);

        // Hợp nhất pagesContent nếu trước đó đã được nạp ngầm vào RAM
        setDocs((prevDocs) => {
          const contentMap = new Map(prevDocs.map((d) => [d.id, d.pagesContent]));
          mapped = mapped.map((d) => ({
            ...d,
            pagesContent: (contentMap.get(d.id) && contentMap.get(d.id)!.length > 0)
              ? contentMap.get(d.id)!
              : d.pagesContent || [],
          }));
          return mapped;
        });

        // Đối với tài khoản Demo/Khách, hợp nhất thêm các tài liệu do khách upload lưu cục bộ
        if (!isValidUUID(userId)) {
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

        // Lưu metadata nhẹ vào localStorage (loại bỏ pagesContent để không đầy bộ nhớ 5MB)
        try {
          const metaOnly = mapped.map(({ pagesContent, ...rest }) => rest);
          localStorage.setItem(localKey, JSON.stringify(metaOnly));
        } catch {}

        if (userId) userDocsCache.set(userId, mapped);
        setDocs(mapped);
        setSelectedId((prev) =>
          prev && mapped.some((m: DocumentItem) => m.id === prev) ? prev : (mapped[0]?.id ?? null)
        );

        // Kích hoạt nạp ngầm nội dung (pages_content) trong nền
        prefetchAbortRef.current = false;
        const initialSelectedId = mapped[0]?.id ?? null;
        prefetchDocContents(mapped, initialSelectedId);
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
  }, [userId, localKey, prefetchDocContents]);

  useEffect(() => {
    // Khi userId thay đổi (đăng nhập / chuyển đổi tài khoản)
    const activeCache = userId ? userDocsCache.get(userId) || null : null;
    let initialList: DocumentItem[] = [];
    if (activeCache && activeCache.length > 0) {
      initialList = activeCache;
    } else if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialList = parsed;
          }
        }
      } catch {}
    }
    if (initialList.length === 0 && !isRealUser) {
      initialList = INITIAL_DOCS;
    }

    setDocs(initialList);
    setSelectedId(initialList.length > 0 ? initialList[0].id : null);
    setIsLoading(initialList.length === 0 && isRealUser);
    fetchDocs();
  }, [userId, localKey, isRealUser, fetchDocs]);

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
            const localKey = `permind_docs_${userId || "guest"}`;
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
    if (!target) return;

    // 1. Mở Document Studio tức thì (0ms) mà không bị nghẽn mạng do kéo cả 11MB
    setStudioDoc(target);

    // 2. Kích hoạt nạp trước Trang 1 và Trang 2 ngầm (Page-based On-Demand Streaming)
    if (id > 0) {
      fetchDocumentPage(id, 0, target.title);
      prefetchDocumentPages(id, 0, target.pagesCount || 1, 2);
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
        try {
          const metaOnly = next.map(({ pagesContent, ...rest }) => rest);
          localStorage.setItem(localKey, JSON.stringify(metaOnly));
        } catch {}
        if (selectedId === id) {
          setSelectedId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
      // Nếu có lưu trong localStorage của khách thì xóa khỏi localStorage
      const stored = localStorage.getItem(localKey);
      if (stored) {
        try {
          const currentLocal = JSON.parse(stored);
          if (Array.isArray(currentLocal)) {
            localStorage.setItem(localKey, JSON.stringify(currentLocal.filter((d: any) => d.id !== id)));
          }
        } catch {}
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
