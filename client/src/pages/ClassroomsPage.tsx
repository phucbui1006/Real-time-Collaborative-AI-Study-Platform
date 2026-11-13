import { useState, useEffect } from "react";
import { RoomHistory } from "../components/classrooms/RoomHistory";
import { JoinRoomModal } from "../components/classrooms/JoinRoomModal";
import { CreateRoomModal } from "../components/classrooms/CreateRoomModal";
import RoomView, { DOCS, DocItem, SlideItem } from "../components/classrooms/RoomView";
import {
  INITIAL_HISTORY,
  COLORS,
  joinRoomApi,
  createRoomApi,
  fetchRoomsApi,
  fetchActiveRoomCountsApi,
  RoomItem,
} from "../services/roomService";
import { idleService } from "../services/idleService";
import { supabase } from "../services/supabaseClient";
import { isValidUUID } from "../utils";

interface ClassroomsPageProps {
  userId?: string;
  userName?: string;
  onEnterRoom?: (room: { name: string; code: string }) => void;
}

export default function ClassroomsPage({
  userId,
  userName,
  onEnterRoom = (room) => console.log("Vào phòng", room),
}: ClassroomsPageProps) {
  const isRealUser = isValidUUID(userId);
  const localKey = `permind_rooms_${userId || "guest"}`;

  // Với tài khoản thật: khởi tạo danh sách rỗng (hoặc từ local cache của chính user)
  // Với tài khoản demo/khách: nạp INITIAL_HISTORY
  const [rooms, setRooms] = useState<RoomItem[]>(() => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) return JSON.parse(stored);
    } catch {}
    return isRealUser ? [] : INITIAL_HISTORY;
  });
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [libraryDocs, setLibraryDocs] = useState<DocItem[]>(DOCS);

  // Nạp toàn bộ tài liệu đã import từ Thư viện để phục vụ trình chiếu slide/ảnh trong phòng học
  useEffect(() => {
    async function loadLibraryDocs() {
      try {
        const loaded: DocItem[] = [];

        // 1. Tải từ Supabase (nếu đã đăng nhập)
        if (isValidUUID(userId)) {
          const { data, error } = await supabase
            .from("documents")
            .select("id, original_name, filename, subject, pages_content, total_pages, created_at")
            .eq("owner_user_id", userId)
            .order("created_at", { ascending: false });

          if (!error && data && Array.isArray(data)) {
            data.forEach((d) => {
              const docTitle = d.original_name || d.filename || "Tài liệu";
              const rawPages: string[] = Array.isArray(d.pages_content) ? d.pages_content : [];
              const safePages = rawPages.length > 0 ? rawPages : [`# ${docTitle}\n\nTài liệu học tập.`];
              const slides: SlideItem[] = safePages.map((pageText, idx) => {
                const imgMatch = typeof pageText === "string" ? pageText.match(/!\[(.*?)\]\((.*?)\)/) : null;
                const imageUrl = imgMatch ? imgMatch[2] : undefined;
                const cleanText = typeof pageText === "string" ? pageText.replace(/!\[.*?\]\(.*?\)/g, "").trim() : "";
                const lines = cleanText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
                const title = lines[0]?.replace(/^#+\s*/, "") || `Trang ${idx + 1}`;
                return {
                  title,
                  points: lines.slice(1, 5),
                  imageUrl,
                };
              });
              loaded.push({
                id: d.id,
                title: docTitle,
                color: "#0b7a75",
                slides,
                pagesContent: safePages,
              });
            });
          }
        }

        // 2. Tải thêm từ bộ nhớ cục bộ (Khách hoặc Offline cache)
        const localKeys = [`permind_docs_${userId || "guest"}`, "permind_docs_guest", "peermind_docs_guest"];
        localKeys.forEach((key) => {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((d: any) => {
                  if (!loaded.some((x) => x.id === d.id)) {
                    const docTitle = d.title || d.original_name || d.filename || "Tài liệu";
                    const rawPages: string[] = Array.isArray(d.pagesContent)
                      ? d.pagesContent
                      : Array.isArray(d.pages_content)
                      ? d.pages_content
                      : [];
                    const safePages = rawPages.length > 0 ? rawPages : [`# ${docTitle}\n\nTài liệu học tập.`];
                    const slides: SlideItem[] = safePages.map((pageText, idx) => {
                      const imgMatch = typeof pageText === "string" ? pageText.match(/!\[(.*?)\]\((.*?)\)/) : null;
                      const imageUrl = imgMatch ? imgMatch[2] : undefined;
                      const cleanText = typeof pageText === "string" ? pageText.replace(/!\[.*?\]\(.*?\)/g, "").trim() : "";
                      const lines = cleanText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
                      const title = lines[0]?.replace(/^#+\s*/, "") || `Trang ${idx + 1}`;
                      return {
                        title,
                        points: lines.slice(1, 5),
                        imageUrl,
                      };
                    });
                    loaded.push({
                      id: d.id,
                      title: docTitle,
                      color: d.color || "#0ea5e9",
                      slides,
                      pagesContent: safePages,
                    });
                  }
                });
              }
            }
          } catch {}
        });

        if (loaded.length > 0) {
          setLibraryDocs([...loaded, ...DOCS]);
        }
      } catch (err) {
        console.warn("Không thể nạp tài liệu thư viện cho phòng học:", err);
      }
    }
    loadLibraryDocs();
  }, [userId]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [data, counts] = await Promise.all([
        fetchRoomsApi(userId),
        fetchActiveRoomCountsApi(),
      ]);

      const enrich = (list: RoomItem[]) =>
        list.map((r) => ({
          ...r,
          onlineCount: counts[r.code] ?? 0,
        }));

      if (isRealUser) {
        // Tài khoản thật: CHỈ lấy các phòng do user tạo trên Supabase hoặc phòng đã tham gia
        const enriched = enrich(data);
        setRooms(enriched);
        try {
          localStorage.setItem(localKey, JSON.stringify(enriched));
        } catch {}
      } else {
        // Tài khoản demo: merge với INITIAL_HISTORY
        if (data && data.length > 0) {
          setRooms((prev) => {
            const merged = [...data];
            prev.forEach((p) => {
              if (!merged.some((m) => m.code === p.code)) {
                merged.push(p);
              }
            });
            const enriched = enrich(merged);
            try {
              localStorage.setItem(localKey, JSON.stringify(enriched));
            } catch {}
            return enriched;
          });
        }
      }
    }
    load();

    // Định kỳ làm mới số lượng người online thực tế mỗi 10 giây
    const interval = setInterval(async () => {
      const counts = await fetchActiveRoomCountsApi();
      setRooms((prev) =>
        prev.map((r) => ({
          ...r,
          onlineCount: counts[r.code] ?? 0,
        }))
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [userId, localKey, isRealUser]);

  // Trạng thái phòng hiện tại đang vào (password chỉ giữ trong RAM phiên hiện tại, không lưu storage)
  const [activeRoom, setActiveRoom] = useState<{
    name: string;
    code: string;
    password?: string;
    isHost?: boolean;
  } | null>(null);

  // Tạm dừng bộ đếm idle khi người dùng đang tham gia phòng học
  useEffect(() => {
    idleService.setPaused("classroom", Boolean(activeRoom));
    return () => {
      idleService.setPaused("classroom", false);
    };
  }, [activeRoom]);

  const remember = (room: { name: string; code: string }) =>
    setRooms((prev) => {
      const updated = [
        {
          id: Date.now(),
          name: room.name,
          code: room.code,
          lastVisit: "Vừa xong",
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        },
        ...prev.filter((r) => r.code !== room.code),
      ];
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

  const handleJoinSubmit = async (data: { code: string; password: string }) => {
    const room = await joinRoomApi(data);
    remember(room);
    setActiveRoom({ name: room.name, code: room.code, password: data.password, isHost: false });
    onEnterRoom(room);
  };

  const handleCreateSubmit = async (data: { name: string; code: string; password: string }) => {
    const room = await createRoomApi({ ...data, hostUserId: userId });
    remember(room);
    return room;
  };

  const handleEnterCreatedRoom = (room: { name: string; code: string }) => {
    setActiveRoom({ name: room.name, code: room.code, isHost: true });
    onEnterRoom(room);
  };

  // "Vào lại": Điền mã phòng và mở popup Tham gia phòng
  const handleRejoin = (room: RoomItem) => {
    setJoinCode(room.code);
    setJoinOpen(true);
  };

  const handleOpenJoinNew = () => {
    setJoinCode("");
    setJoinOpen(true);
  };

  // Nếu đang trong phòng học
  if (activeRoom) {
    return (
      <RoomView
        room={activeRoom}
        isHost={activeRoom.isHost ?? true}
        userId={userId}
        userName={userName}
        docs={libraryDocs}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  const handleRemoveRoom = async (id: number) => {
    if (isValidUUID(userId)) {
      try {
        await supabase.from("rooms").delete().eq("id", id).eq("host_user_id", userId);
      } catch {}
    }
    setRooms((r) => {
      const updated = r.filter((x) => x.id !== id);
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  return (
    <main className="w-full py-2 sm:py-6">
      <RoomHistory
        rooms={rooms}
        onRejoin={handleRejoin}
        onRemove={handleRemoveRoom}
        onOpenJoin={handleOpenJoinNew}
        onOpenCreate={() => setCreateOpen(true)}
        userName={userName}
      />

      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={handleJoinSubmit}
        initialCode={joinCode}
      />

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateSubmit}
        onEnterCreatedRoom={handleEnterCreatedRoom}
      />
    </main>
  );
}
