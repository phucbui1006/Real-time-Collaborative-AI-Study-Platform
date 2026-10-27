import { useState, useEffect } from "react";
import { RoomHistory } from "../components/classrooms/RoomHistory";
import { JoinRoomModal } from "../components/classrooms/JoinRoomModal";
import { CreateRoomModal } from "../components/classrooms/CreateRoomModal";
import RoomView from "../components/classrooms/RoomView";
import {
  INITIAL_HISTORY,
  COLORS,
  joinRoomApi,
  createRoomApi,
  fetchRoomsApi,
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
  const localKey = `peermind_rooms_${userId || "guest"}`;

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
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchRoomsApi(userId);
      if (isRealUser) {
        // Tài khoản thật: CHỈ lấy các phòng do user tạo trên Supabase hoặc phòng đã tham gia
        setRooms(data);
        try {
          localStorage.setItem(localKey, JSON.stringify(data));
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
            try {
              localStorage.setItem(localKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    }
    load();
  }, [userId, localKey, isRealUser]);

  // Trạng thái phòng hiện tại đang vào (nếu có)
  const [activeRoom, setActiveRoom] = useState<{
    name: string;
    code: string;
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
    setActiveRoom({ name: room.name, code: room.code, isHost: false });
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
        onLeave={() => setActiveRoom(null)}
        userId={userId}
        userName={userName}
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
