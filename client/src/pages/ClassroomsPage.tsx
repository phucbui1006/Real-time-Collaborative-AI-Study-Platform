import { useState } from "react";
import { RoomHistory } from "../components/classrooms/RoomHistory";
import { JoinRoomModal } from "../components/classrooms/JoinRoomModal";
import { CreateRoomModal } from "../components/classrooms/CreateRoomModal";
import {
  INITIAL_HISTORY,
  COLORS,
  joinRoomApi,
  createRoomApi,
  RoomItem,
} from "../services/roomService";

interface ClassroomsPageProps {
  onEnterRoom?: (room: { name: string; code: string }) => void;
}

export default function ClassroomsPage({
  onEnterRoom = (room) => console.log("Vào phòng", room),
}: ClassroomsPageProps) {
  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_HISTORY);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const remember = (room: { name: string; code: string }) =>
    setRooms((prev) => [
      {
        id: Date.now(),
        name: room.name,
        code: room.code,
        lastVisit: "Vừa xong",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      },
      ...prev.filter((r) => r.code !== room.code),
    ]);

  const handleJoinSubmit = async (data: { code: string; password: string }) => {
    const room = await joinRoomApi(data);
    remember(room);
    onEnterRoom(room);
  };

  const handleCreateSubmit = async (data: { name: string; code: string; password: string }) => {
    const room = await createRoomApi(data);
    remember(room);
    return room;
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

  return (
    <main className="w-full py-2 sm:py-6">
      <RoomHistory
        rooms={rooms}
        onRejoin={handleRejoin}
        onRemove={(id) => setRooms((r) => r.filter((x) => x.id !== id))}
        onOpenJoin={handleOpenJoinNew}
        onOpenCreate={() => setCreateOpen(true)}
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
      />
    </main>
  );
}
