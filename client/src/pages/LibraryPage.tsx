// pages/LibraryPage.tsx — Trang quản lý thư viện tài liệu cá nhân kết nối Supabase trực tiếp
import { useState, useEffect, useCallback, useRef } from "react";
import {
  DocumentItem,
  INITIAL_DOCS,
  normalizeDocumentPages,
  buildChunksFromPages,
} from "../services/aiService";
import { DocumentStore } from "../components/documents/DocumentStore";
import { AIChat } from "../components/documents/AIChat";
import { DocumentStudioView } from "../components/documents/DocumentStudioView";
import { supabase } from "../services/supabaseClient";
import { isValidUUID } from "../utils";
import { extractDocumentContent } from "../services/pdfService";
import {
  fetchDocumentPage,
  prefetchDocumentPages,
  cacheAllDocumentPages,
} from "../services/documentPagingService";

interface SupabaseDoc {
  id: number;
  filename: string;
  original_name?: string;
  subject?: string;
  total_pages?: number;
  file_url?: string;
  created_at?: string;
  pages_content?: any[];
  chunks?: any[];
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

  // Số trang THẬT của tài liệu:
  const pagesCount = d.total_pages || (Array.isArray(d.pages_content) ? d.pages_content.length : 1);
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

  const rawPages = Array.isArray(d.pages_content) ? d.pages_content : [];
  const normalizedPages = normalizeDocumentPages(rawPages);
  const chunks = Array.isArray(d.chunks) && d.chunks.length > 0
    ? d.chunks
    : (normalizedPages.length > 0 ? buildChunksFromPages(normalizedPages) : []);

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
    pagesContent: normalizedPages.length > 0 ? normalizedPages : rawPages,
    chunks,
    isPublic: !d.owner_user_id,
    ownerUserId: d.owner_user_id || null,
  };
}

// Cache theo từng userId để lưu danh sách tài liệu độc lập giữa các tài khoản
const userDocsCache = new Map<string, DocumentItem[]>();

export function clearAllUserState() {
  userDocsCache.clear();
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("peermind_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("peermind_")) {
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
  const localKey = `peermind_docs_${userId || "guest"}`;
  const currentCache = userId ? userDocsCache.get(userId) || null : null;

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
   * Tiến trình âm thầm nạp trước nội dung trang (pages_content, chunks) trong nền
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
        if (doc.id < 0) continue;

        const existing = userDocsCache.get(userId || "")?.find((d) => d.id === doc.id);
        if (existing?.pagesContent && existing.pagesContent.length > 0) continue;

        while (isUserActionActiveRef.current) {
          if (!isMountedRef.current || prefetchAbortRef.current) break;
          await new Promise((r) => setTimeout(r, 200));
        }

        if (!isMountedRef.current || prefetchAbortRef.current) break;

        try {
          const { data: detail } = await supabase
            .from("documents")
            .select("pages_content, chunks, total_pages")
            .eq("id", doc.id)
            .single();

          if (detail && Array.isArray(detail.pages_content) && detail.pages_content.length > 0) {
            if (!isMountedRef.current || prefetchAbortRef.current) break;

            const normalizedPages = normalizeDocumentPages(detail.pages_content);
            const chunks = Array.isArray(detail.chunks) && detail.chunks.length > 0
              ? detail.chunks
              : buildChunksFromPages(normalizedPages);

            cacheAllDocumentPages(doc.id, normalizedPages);

            setDocs((prev) => {
              const next = prev.map((d) =>
                d.id === doc.id
                  ? {
                      ...d,
                      pagesContent: normalizedPages,
                      chunks,
                      pagesCount: detail.total_pages || normalizedPages.length || d.pagesCount,
                    }
                  : d
              );
              if (userId) userDocsCache.set(userId, next);
              return next;
            });
          }
        } catch {
          // ignore
        }

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

      if (!activeCache && !hasStoredData) {
        setIsLoading(true);
      }

      let query = supabase
        .from("documents")
        .select("id, filename, original_name, subject, total_pages, file_url, created_at, owner_user_id");

      if (isValidUUID(userId)) {
        query = query.eq("owner_user_id", userId);
      } else {
        query = query.is("owner_user_id", null);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

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

        setDocs((prevDocs) => {
          const contentMap = new Map(prevDocs.map((d) => [d.id, d.pagesContent]));
          const chunksMap = new Map(prevDocs.map((d) => [d.id, d.chunks]));
          mapped = mapped.map((d) => ({
            ...d,
            pagesContent: (contentMap.get(d.id) && contentMap.get(d.id)!.length > 0)
              ? contentMap.get(d.id)!
              : d.pagesContent || [],
            chunks: (chunksMap.get(d.id) && chunksMap.get(d.id)!.length > 0)
              ? chunksMap.get(d.id)!
              : d.chunks || [],
          }));
          return mapped;
        });

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

        try {
          const metaOnly = mapped.map(({ pagesContent, chunks, ...rest }) => rest);
          localStorage.setItem(localKey, JSON.stringify(metaOnly));
        } catch {}

        if (userId) userDocsCache.set(userId, mapped);
        setDocs(mapped);
        setSelectedId((prev) =>
          prev && mapped.some((m: DocumentItem) => m.id === prev) ? prev : (mapped[0]?.id ?? null)
        );

        prefetchAbortRef.current = false;
        const initialSelectedId = mapped[0]?.id ?? null;
        prefetchDocContents(mapped, initialSelectedId);
      }
    } catch (err) {
      console.warn("Không thể tải tài liệu:", err);
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
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".txt", ".md"];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File "${file.name}" dung lượng ${(file.size / (1024 * 1024)).toFixed(1)} MB vượt quá giới hạn (tối đa 20 MB).`
        );
      }

      const cleanName = file.name
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\.\.+/g, ".")
        .trim()
        .slice(0, 120);

      const ext = cleanName.substring(cleanName.lastIndexOf(".")).toLowerCase();

      // Kiểm tra file Word cũ (.doc)
      if (ext === ".doc") {
        throw new Error("Vui lòng lưu file thành .docx hoặc .pdf rồi tải lên lại");
      }

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(
          `Định dạng "${ext}" không được hỗ trợ. Vui lòng chọn file PDF, Word (.docx) hoặc PowerPoint (.pptx).`
        );
      }

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
        updatedAt: "Đang đọc trang...",
        uploadProgress: "Đang khởi tạo bóc tách...",
        pagesContent: [],
        chunks: [],
        isPublic: false,
        ownerUserId: userId || null,
        isUploading: true,
      };

      setDocs((prev) => [tempDoc, ...prev]);

      (async () => {
        try {
          const extracted = await extractDocumentContent(file, (cur, tot, msg) => {
            setDocs((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? {
                      ...d,
                      uploadProgress: msg || `Đang đọc trang ${cur}/${tot}...`,
                    }
                  : d
              )
            );
          });

          const docPayload: any = {
            filename: cleanName,
            original_name: cleanName,
            subject: customSubject,
            total_pages: extracted.totalPages,
            file_url: null,
            pages_content: extracted.pages,
            chunks: extracted.chunks,
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
              chunks: extracted.chunks,
              isPublic: false,
              ownerUserId: userId || null,
            });
            localStorage.setItem(localKey, JSON.stringify(currentLocal));
          }

          cacheAllDocumentPages(tempId, extracted.pages);
          await fetchDocs();
        } catch (err: any) {
          console.error("Lỗi khi bóc tách tài liệu nền:", err);
          setDocs((prev) =>
            prev.map((d) =>
              d.id === tempId
                ? {
                    ...d,
                    isUploading: false,
                    uploadProgress: undefined,
                    uploadError: err?.message || "Không thể bóc tách nội dung tài liệu này",
                  }
                : d
            )
          );
        }
      })();
    }
  };

  /**
   * Cập nhật tài liệu cũ theo logic bóc tách mới (Re-import)
   */
  const handleReimport = async (docId: number, file: File): Promise<void> => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File "${file.name}" dung lượng ${(file.size / (1024 * 1024)).toFixed(1)} MB vượt quá 20 MB.`);
      return;
    }

    const cleanName = file.name
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\.\.+/g, ".")
      .trim()
      .slice(0, 120);

    const ext = cleanName.substring(cleanName.lastIndexOf(".")).toLowerCase();
    if (ext === ".doc") {
      alert("Vui lòng lưu file thành .docx hoặc .pdf rồi tải lên lại");
      return;
    }

    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              isUploading: true,
              uploadProgress: "Đang bắt đầu bóc tách lại...",
              uploadError: undefined,
            }
          : d
      )
    );

    try {
      const extracted = await extractDocumentContent(file, (cur, tot, msg) => {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  uploadProgress: msg || `Đang đọc trang ${cur}/${tot}...`,
                }
              : d
          )
        );
      });

      if (isValidUUID(userId) && docId > 0) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({
            total_pages: extracted.totalPages,
            pages_content: extracted.pages,
            chunks: extracted.chunks,
            original_name: cleanName,
          })
          .eq("id", docId)
          .eq("owner_user_id", userId);

        if (updateError) {
          throw new Error(`Lỗi cập nhật CSDL: ${updateError.message}`);
        }
      } else {
        const localKey = `peermind_docs_${userId || "guest"}`;
        const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
        const updatedLocal = currentLocal.map((d: any) =>
          d.id === docId
            ? {
                ...d,
                title: cleanName.replace(/\.[^/.]+$/, ""),
                pagesCount: extracted.totalPages,
                pagesContent: extracted.pages,
                chunks: extracted.chunks,
                updatedAt: "Vừa cập nhật",
              }
            : d
        );
        localStorage.setItem(localKey, JSON.stringify(updatedLocal));
      }

      cacheAllDocumentPages(docId, extracted.pages);

      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                isUploading: false,
                uploadProgress: undefined,
                pagesCount: extracted.totalPages,
                pagesContent: extracted.pages,
                chunks: extracted.chunks,
                title: cleanName.replace(/\.[^/.]+$/, ""),
                updatedAt: "Vừa xong",
              }
            : d
        )
      );

      if (studioDoc && studioDoc.id === docId) {
        setStudioDoc((prev) =>
          prev
            ? {
                ...prev,
                pagesCount: extracted.totalPages,
                pagesContent: extracted.pages,
                chunks: extracted.chunks,
                title: cleanName.replace(/\.[^/.]+$/, ""),
              }
            : null
        );
      }
    } catch (err: any) {
      console.error("Lỗi khi import lại tài liệu:", err);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                isUploading: false,
                uploadProgress: undefined,
                uploadError: err?.message || "Không thể bóc tách nội dung tài liệu này.",
              }
            : d
        )
      );
    }
  };

  const handleSelectDoc = (id: number) => {
    setSelectedId(id);
    const target = docs.find((d) => d.id === id);
    if (!target) return;

    setStudioDoc(target);

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
      if (isValidUUID(userId)) {
        await supabase.from("documents").delete().eq("id", id).eq("owner_user_id", userId);
      }
      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (userId) userDocsCache.set(userId, next);
        try {
          const metaOnly = next.map(({ pagesContent, chunks, ...rest }) => rest);
          localStorage.setItem(localKey, JSON.stringify(metaOnly));
        } catch {}
        if (selectedId === id) {
          setSelectedId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
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
        onReimport={handleReimport}
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
          onReimport={handleReimport}
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
