// client/src/types/classroom.ts
// Định nghĩa kiểu dữ liệu toàn diện cho Socket.io, WebRTC mesh và trạng thái phòng học PeerMind

/**
 * Thông tin chi tiết của một thành viên trong phòng học
 */
export interface RoomMember {
  socketId: string;         // Định danh socket kết nối real-time
  userId: string;           // ID người dùng (UUID Supabase hoặc guest ID)
  userName: string;         // Tên hiển thị của thành viên
  role: 'host' | 'speaker' | 'viewer';  // Vai trò 3 cấp: 'host' (Chủ phòng), 'speaker' (Diễn giả/Được phát biểu), 'viewer' (Người xem)
  avatarColor: string;      // Mã màu đại diện avatar
  avatarUrl?: string;       // Đường dẫn ảnh đại diện nếu có
  isMicOn: boolean;         // Trạng thái bật/tắt Micro
  isCamOn: boolean;         // Trạng thái bật/tắt Camera
  isScreenSharing: boolean; // Trạng thái đang chia sẻ màn hình
  isSpeaking: boolean;      // Trạng thái phát hiện đang phát biểu (VAD)
  isHandRaised?: boolean;   // Trạng thái đang giơ tay phát biểu
  joinedAt: number;         // Thời điểm tham gia phòng (timestamp ms)
}

/**
 * Chú thích / Khoanh vùng vẽ trực quan trên trang tài liệu
 */
export interface DocumentAnnotation {
  id: string;
  type: 'rect' | 'highlight' | 'text';
  x: number;      // Tọa độ X tương đối (%) (0 -> 100)
  y: number;      // Tọa độ Y tương đối (%) (0 -> 100)
  width: number;  // Chiều rộng tương đối (%) (0 -> 100)
  height: number; // Chiều cao tương đối (%) (0 -> 100)
  color: string;  // Màu viền hoặc màu highlight (hex/rgba)
  text?: string;  // Nội dung ghi chú (nếu type === 'text')
  createdAt: number;
}

export type AnnotationsByPage = Record<number, DocumentAnnotation[]>;

/**
 * Bản sao tài liệu đang được trình chiếu trong phòng học
 */
export interface RoomDocumentData {
  id: number;                          // ID bản ghi trong bảng room_documents
  originalDocumentId?: number | null;  // ID tài liệu gốc trong kho documents
  title: string;                       // Tiêu đề tài liệu
  totalPages: number;                  // Tổng số trang
  pagesContent?: string[];             // Mảng nội dung văn bản (tùy chọn khi nạp lazy)
  currentPage: number;                 // Trang hiện tại đang chiếu (bắt đầu từ 0)
  updatedAt: string;                   // Thời điểm cập nhật nội dung gần nhất
}

/**
 * Toàn bộ trạng thái thời gian thực của phòng học (Room State Snapshot)
 */
export interface RoomState {
  code: string;                          // Mã phòng 6 số duy nhất
  name: string;                          // Tên phòng học
  hostUserId: string;                    // ID tài khoản của Chủ phòng
  hostSocketId: string;                  // Socket ID hiện tại của Chủ phòng
  members: RoomMember[];                 // Danh sách thành viên đang có mặt trong phòng
  activeDocument: RoomDocumentData | null;// Tài liệu đang được trình chiếu (hoặc null nếu chưa chiếu)
  annotationsByPage?: AnnotationsByPage; // Danh sách ghi chú khoanh vùng theo từng trang (In-Memory)
  screenSharerSocketId: string | null;   // Socket ID của người đang chia sẻ màn hình
  allowMemberScreenShare: boolean;       // Cho phép thành viên thường chia sẻ màn hình hay không
  maxMembers: number;                    // Số lượng người tham gia tối đa (mặc định 6 cho WebRTC Mesh)
}

/**
 * Cấu trúc tin nhắn trò chuyện trong phòng
 */
export interface ChatMessage {
  id: string;          // Mã định danh duy nhất của tin nhắn
  senderId?: string;   // ID người gửi
  senderName: string;  // Tên người gửi
  text: string;        // Nội dung tin nhắn
  time: string;        // Thời gian gửi dạng HH:mm
  me?: boolean;        // Đánh dấu nếu là tin nhắn do chính mình gửi
}

/**
 * Danh sách sự kiện Client gửi lên Server (Client -> Server)
 */
export interface ClientToServerEvents {
  // Tham gia phòng học kèm thông tin người dùng
  'ROOM:JOIN': (payload: { roomCode: string; user: { id: string; name: string; avatarColor?: string } }) => void;
  // Rời khỏi phòng học
  'ROOM:LEAVE': (payload: { roomCode: string }) => void;
  // Bật/tắt Micro hoặc Camera
  'ROOM:MEDIA_TOGGLE': (payload: { roomCode: string; isMicOn?: boolean; isCamOn?: boolean }) => void;
  // Gửi trạng thái âm lượng đang nói (Voice Activity Detection)
  'ROOM:SPEAKING_STATE': (payload: { roomCode: string; isSpeaking: boolean }) => void;
  // Bắt đầu chia sẻ màn hình máy tính
  'ROOM:SCREEN_SHARE_START': (
    payload: { roomCode: string },
    ack?: (res: { ok: boolean; message?: string }) => void
  ) => void;
  // Dừng chia sẻ màn hình máy tính
  'ROOM:SCREEN_SHARE_STOP': (payload: { roomCode: string }) => void;

  // Giơ tay phát biểu
  'ROOM:RAISE_HAND': (payload: { roomCode: string; isRaised: boolean }) => void;
  // Cấp / Hạ vai trò thành viên (Host only)
  'ROOM:SET_ROLE': (payload: { roomCode: string; targetSocketId: string; role: 'speaker' | 'viewer' }) => void;

  // Quyền hạn dành riêng cho Chủ phòng (Host)
  'ROOM:MUTE_MEMBER': (payload: { roomCode: string; targetSocketId: string }) => void;
  'ROOM:KICK_MEMBER': (payload: { roomCode: string; targetSocketId: string }) => void;
  'ROOM:TRANSFER_HOST': (payload: { roomCode: string; targetSocketId: string }) => void;
  'ROOM:TOGGLE_SCREEN_PERMISSION': (payload: { roomCode: string; allow: boolean }) => void;
  'ROOM:CLOSE': (payload: { roomCode: string }) => void;

  // Gửi tin nhắn trò chuyện
  'CHAT:SEND': (payload: { roomCode: string; message: string }) => void;

  // Điều khiển tài liệu bài học (Host)
  'DOC:SELECT': (payload: { roomCode: string; documentId: number; docData?: { title: string; pagesContent?: string[]; totalPages: number } }) => void;
  'DOC:STOP': (payload: { roomCode: string }) => void;
  'DOC:CHANGE_PAGE': (payload: { roomCode: string; pageIndex: number }) => void;
  'DOC:EDIT_PAGE': (payload: { roomCode: string; pageIndex: number; content: string }) => void;
  'DOC:ANNOTATE': (payload: { roomCode: string; pageIndex: number; annotations: DocumentAnnotation[] }) => void;
  'DOC:CLEAR_ANNOTATIONS': (payload: { roomCode: string; pageIndex?: number }) => void;

  // WebRTC Signaling: chuyển tiếp Offer, Answer và ICE Candidate
  'WEBRTC:OFFER': (payload: { roomCode: string; targetSocketId: string; offer: RTCSessionDescriptionInit }) => void;
  'WEBRTC:ANSWER': (payload: { roomCode: string; targetSocketId: string; answer: RTCSessionDescriptionInit }) => void;
  'WEBRTC:ICE': (payload: { roomCode: string; targetSocketId: string; candidate: RTCIceCandidateInit }) => void;
}

/**
 * Danh sách sự kiện Server phát về Client (Server -> Client)
 */
export interface ServerToClientEvents {
  // Đồng bộ toàn bộ trạng thái phòng khi tham gia
  'ROOM:STATE': (state: RoomState) => void;
  // Thông báo có thành viên mới vào phòng
  'ROOM:MEMBER_JOINED': (member: RoomMember) => void;
  // Thông báo có thành viên rời phòng
  'ROOM:MEMBER_LEFT': (data: { socketId: string; userId: string; reason?: string }) => void;
  // Cập nhật trạng thái một thành viên (Mic/Cam/Màn hình/Đang nói)
  'ROOM:MEMBER_UPDATED': (data: Partial<RoomMember> & { socketId: string }) => void;
  // Bị Chủ phòng mời ra khỏi phòng học
  'ROOM:KICKED': (data: { reason: string }) => void;
  // Phòng học bị đóng bởi Chủ phòng
  'ROOM:CLOSED': (data: { reason: string }) => void;
  // Quyền Chủ phòng được chuyển giao cho người khác
  'ROOM:HOST_CHANGED': (data: { newHostUserId: string; newHostSocketId: string }) => void;
  // Vai trò của một thành viên bị thay đổi (Host/Speaker/Viewer)
  'ROOM:ROLE_CHANGED': (data: { targetSocketId: string; role: 'host' | 'speaker' | 'viewer'; targetUserName: string }) => void;
  // Bị Chủ phòng tắt micro
  'ROOM:MUTED_BY_HOST': () => void;

  // Nhận tin nhắn mới
  'CHAT:MESSAGE': (message: ChatMessage) => void;
  // Tải toàn bộ lịch sử tin nhắn gần nhất
  'CHAT:HISTORY': (messages: ChatMessage[]) => void;

  // Đồng bộ tài liệu trình chiếu hiện tại
  'DOC:SYNC': (document: RoomDocumentData | null) => void;
  // Trang tài liệu thay đổi do Chủ phòng lật trang
  'DOC:PAGE_CHANGED': (data: { pageIndex: number; by: string }) => void;
  // Nội dung trang tài liệu được Chủ phòng chỉnh sửa realtime
  'DOC:PAGE_UPDATED': (data: { pageIndex: number; content: string; by: string }) => void;
  // Đồng bộ chú thích / khoanh vùng trên trang tài liệu
  'DOC:ANNOTATE': (data: { pageIndex: number; annotations: DocumentAnnotation[]; by: string }) => void;
  'DOC:CLEAR_ANNOTATIONS': (data: { pageIndex?: number }) => void;

  // Tín hiệu kết nối WebRTC Mesh
  'WEBRTC:OFFER': (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => void;
  'WEBRTC:ANSWER': (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => void;
  'WEBRTC:ICE': (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => void;

  // Thông báo lỗi từ máy chủ
  'ERROR': (data: { message: string; code?: string }) => void;
}
