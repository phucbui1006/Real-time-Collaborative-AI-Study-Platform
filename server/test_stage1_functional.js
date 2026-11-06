// server/test_stage1_functional.js
// Script kiểm thử chức năng tự động Giai đoạn 1 cho PeerMind Meet (Chạy độc lập & Siêu tốc)

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require(require.resolve('socket.io-client', { paths: [path.resolve(__dirname, '../client')] }));

// Mock Supabase Database để test chạy độc lập, siêu tốc và không phụ thuộc mạng
const { supabaseAdmin } = require('./src/config/supabase');
const mockDbRoom = {
  id: '00000000-0000-0000-0000-000000000001',
  code: 'TEST99',
  name: 'Phòng học Kiểm thử Giai đoạn 1',
  is_active: true,
  host_user_id: 'host-user-1',
  max_members: 10,
  current_page: 0,
};

supabaseAdmin.from = (table) => {
  if (table === 'rooms') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...mockDbRoom }, error: null })
          })
        })
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null })
      })
    };
  }
  if (table === 'room_members') {
    return {
      upsert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: () => ({
          eq: async () => ({ data: null, error: null })
        })
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { user_id: 'viewer-user-1' }, error: null })
            })
          })
        })
      })
    };
  }
  if (table === 'room_documents') {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 101,
                  room_id: mockDbRoom.id,
                  original_document_id: null,
                  title: 'Tài liệu Toán Cao Cấp',
                  total_pages: 5,
                  pages_content: ['# Trang 1', '# Trang 2', '# Trang 3', '# Trang 4', '# Trang 5'],
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            })
          })
        })
      }),
      upsert: async () => ({ data: null, error: null })
    };
  }
  if (table === 'room_messages') {
    return {
      insert: async () => ({ data: null, error: null }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null })
          })
        })
      })
    };
  }
  return {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
  };
};

const { initSockets } = require('./src/sockets/index');
const { getActiveRooms } = require('./src/sockets/roomHandler');

const TEST_PORT = 5199;
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const ROOM_CODE = 'TEST99';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 1: TỐI ƯU NỀN TẢNG');
  console.log('================================================================\n');

  // Khởi động Test Server
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  initSockets(io);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Setup] Server test đã sẵn sàng tại port ${TEST_PORT}`);

  const results = [];

  const addResult = (testName, passed, details) => {
    results.push({ testName, passed, details });
    const mark = passed ? '✅ ĐẠT' : '❌ KHÔNG ĐẠT';
    console.log(`${mark} | ${testName} -> ${details}`);
  };

  let hostClient = null;
  let viewerClient = null;
  let viewer2Client = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Kết nối và Phân vai trò (Host vs Viewer)
    // -------------------------------------------------------------
    hostClient = ioClient(SERVER_URL, { forceNew: true, reconnection: false });
    await new Promise((res) => hostClient.on('connect', res));

    hostClient.emit('ROOM:JOIN', {
      roomCode: ROOM_CODE,
      user: { id: 'host-user-1', name: 'Giảng viên Phúc', avatarColor: '#0ea5e9' }
    });

    const hostState = await new Promise((res) => {
      hostClient.once('ROOM:STATE', res);
    });

    const isHostRoleAssigned = hostState.members.some(
      (m) => m.socketId === hostClient.id && m.role === 'host'
    );
    addResult(
      'Phân quyền Host',
      isHostRoleAssigned,
      `Thành viên tạo phòng có role = '${hostState.members[0]?.role}'`
    );

    // Viewer tham gia
    viewerClient = ioClient(SERVER_URL, { forceNew: true, reconnection: false });
    await new Promise((res) => viewerClient.on('connect', res));

    viewerClient.emit('ROOM:JOIN', {
      roomCode: ROOM_CODE,
      user: { id: 'viewer-user-1', name: 'Sinh viên A', avatarColor: '#10b981' }
    });

    const viewerState = await new Promise((res) => {
      viewerClient.once('ROOM:STATE', res);
    });

    const viewerMember = viewerState.members.find((m) => m.socketId === viewerClient.id);
    addResult(
      'Phân quyền Viewer',
      viewerMember?.role === 'viewer',
      `Người tham gia sau có role = '${viewerMember?.role}' (mặc định viewer)`
    );

    // -------------------------------------------------------------
    // Test 2: Server-side Check - Viewer lật trang bị từ chối
    // -------------------------------------------------------------
    let pageChangeRejected = false;
    let pageChangeErrorMsg = '';

    const errPromise1 = new Promise((res) => {
      viewerClient.once('ERROR', (data) => {
        pageChangeRejected = true;
        pageChangeErrorMsg = data.message;
        res();
      });
    });

    viewerClient.emit('DOC:CHANGE_PAGE', { roomCode: ROOM_CODE, pageIndex: 3 });
    await Promise.race([errPromise1, new Promise((r) => setTimeout(r, 600))]);

    addResult(
      'Server-side: Chặn Viewer lật trang',
      pageChangeRejected,
      `Server từ chối với lỗi: "${pageChangeErrorMsg}"`
    );

    // -------------------------------------------------------------
    // Test 3: Server-side Check - Viewer ghi chú bị từ chối
    // -------------------------------------------------------------
    let annotateRejected = false;
    let annotateErrorMsg = '';

    const errPromise2 = new Promise((res) => {
      viewerClient.once('ERROR', (data) => {
        annotateRejected = true;
        annotateErrorMsg = data.message;
        res();
      });
    });

    viewerClient.emit('DOC:ANNOTATE', {
      roomCode: ROOM_CODE,
      pageIndex: 0,
      annotations: [{ id: 'anno_1', type: 'rect', x: 10, y: 10, width: 20, height: 20, color: '#ef4444' }]
    });
    await Promise.race([errPromise2, new Promise((r) => setTimeout(r, 600))]);

    addResult(
      'Server-side: Chặn Viewer vẽ chú thích',
      annotateRejected,
      `Server từ chối với lỗi: "${annotateErrorMsg}"`
    );

    // -------------------------------------------------------------
    // Test 4: Server-side Check - Viewer bật mic bị từ chối
    // -------------------------------------------------------------
    let micToggleRejected = false;
    let micErrorMsg = '';

    const errPromise3 = new Promise((res) => {
      viewerClient.once('ERROR', (data) => {
        micToggleRejected = true;
        micErrorMsg = data.message;
        res();
      });
    });

    viewerClient.emit('ROOM:MEDIA_TOGGLE', { roomCode: ROOM_CODE, isMicOn: true });
    await Promise.race([errPromise3, new Promise((r) => setTimeout(r, 600))]);

    addResult(
      'Server-side: Chặn Viewer bật Mic',
      micToggleRejected,
      `Server từ chối với lỗi: "${micErrorMsg}"`
    );

    // -------------------------------------------------------------
    // Test 5: Giơ tay và Host duyệt Speaker
    // -------------------------------------------------------------
    viewerClient.emit('ROOM:RAISE_HAND', { roomCode: ROOM_CODE, isRaised: true });
    await new Promise((r) => setTimeout(r, 200));

    const activeRooms = getActiveRooms();
    const roomMem = activeRooms.get(ROOM_CODE)?.members?.get(viewerClient.id);
    const handRaisedSuccess = roomMem?.isHandRaised === true;
    addResult(
      'Tính năng Giơ tay',
      handRaisedSuccess,
      `Trạng thái isHandRaised của Viewer trên server = ${roomMem?.isHandRaised}`
    );

    // Host duyệt Speaker
    let roleChangeReceived = false;
    let newAssignedRole = '';

    const rolePromise = new Promise((res) => {
      viewerClient.once('ROOM:ROLE_CHANGED', (data) => {
        roleChangeReceived = true;
        newAssignedRole = data.role;
        res();
      });
    });

    hostClient.emit('ROOM:SET_ROLE', {
      roomCode: ROOM_CODE,
      targetSocketId: viewerClient.id,
      role: 'speaker'
    });

    await Promise.race([rolePromise, new Promise((r) => setTimeout(r, 800))]);

    addResult(
      'Host duyệt quyền Speaker',
      roleChangeReceived && newAssignedRole === 'speaker',
      `Viewer nhận event ROOM:ROLE_CHANGED với role = '${newAssignedRole}'`
    );

    // -------------------------------------------------------------
    // Test 6: Speaker được phép ghi chú sau khi được duyệt
    // -------------------------------------------------------------
    let speakerAnnotateSuccess = false;
    const annoPromise = new Promise((res) => {
      hostClient.once('DOC:ANNOTATE', () => {
        speakerAnnotateSuccess = true;
        res();
      });
    });

    viewerClient.emit('DOC:ANNOTATE', {
      roomCode: ROOM_CODE,
      pageIndex: 0,
      annotations: [{ id: 'anno_speaker_1', type: 'rect', x: 15, y: 15, width: 25, height: 25, color: '#0d9488' }]
    });

    await Promise.race([annoPromise, new Promise((r) => setTimeout(r, 600))]);
    addResult(
      'Quyền Diễn giả (Speaker): Vẽ chú thích thành công',
      speakerAnnotateSuccess,
      'Sau khi được nâng lên Speaker, sự kiện DOC:ANNOTATE được server chấp thuận và broadcast tới Host'
    );

    // -------------------------------------------------------------
    // Test 7: Host lật trang - Đo kích thước Payload
    // -------------------------------------------------------------
    let pageChangedPayload = null;
    const pagePromise = new Promise((res) => {
      viewerClient.once('DOC:PAGE_CHANGED', (payload) => {
        pageChangedPayload = payload;
        res();
      });
    });

    hostClient.emit('DOC:CHANGE_PAGE', { roomCode: ROOM_CODE, pageIndex: 2 });
    await Promise.race([pagePromise, new Promise((r) => setTimeout(r, 600))]);

    const payloadString = JSON.stringify(pageChangedPayload);
    const hasPagesContent = 'pagesContent' in (pageChangedPayload || {});
    const payloadByteSize = Buffer.byteLength(payloadString, 'utf8');

    addResult(
      'Lazy Load: Payload lật trang tinh gọn',
      !hasPagesContent && payloadByteSize < 100,
      `Payload: "${payloadString}" (${payloadByteSize} bytes, KHÔNG chứa pages_content)`
    );

    // -------------------------------------------------------------
    // Test 8: Người vào giữa buổi nhận Snapshot trang hiện tại
    // -------------------------------------------------------------
    viewer2Client = ioClient(SERVER_URL, { forceNew: true, reconnection: false });
    await new Promise((res) => viewer2Client.on('connect', res));

    viewer2Client.emit('ROOM:JOIN', {
      roomCode: ROOM_CODE,
      user: { id: 'viewer-user-2', name: 'Sinh viên B', avatarColor: '#8b5cf6' }
    });

    const midState = await new Promise((res) => {
      viewer2Client.once('ROOM:STATE', res);
    });

    const docSnapshot = midState.activeDocument;
    const isDocLazyLoaded = docSnapshot ? !docSnapshot.pagesContent : true;
    const isCorrectPage = docSnapshot?.currentPage === 2;

    addResult(
      'Người vào giữa buổi nhận đúng trang & snapshot',
      isCorrectPage && isDocLazyLoaded,
      `Trang nhận được: Trang ${docSnapshot?.currentPage + 1}, metadata pagesContent tách rời khỏi socket state`
    );

    // -------------------------------------------------------------
    // Test 9: Rate limit Chat (Chống spam)
    // -------------------------------------------------------------
    let chatBlockCount = 0;
    viewerClient.on('ERROR', (data) => {
      if (data?.code === 'CHAT_RATE_LIMIT') {
        chatBlockCount++;
      }
    });

    // Bắn dồn 10 tin nhắn liên tục trong tích tắc
    for (let i = 0; i < 10; i++) {
      viewerClient.emit('CHAT:SEND', {
        roomCode: ROOM_CODE,
        message: `Spam test message ${i + 1}`
      });
    }

    await new Promise((r) => setTimeout(r, 600));

    addResult(
      'Chat Rate Limit (1 tin/giây/socket)',
      chatBlockCount >= 8,
      `Gửi 10 tin dồn dập -> Server chặn ${chatBlockCount} tin quá nhanh`
    );

    // -------------------------------------------------------------
    // Test 10: Host thoát -> Chuyển giao Host cho người vào sớm nhất
    // -------------------------------------------------------------
    let newHostAssigned = false;
    let newHostUserId = '';

    const hostChangePromise = new Promise((res) => {
      viewerClient.once('ROOM:HOST_CHANGED', (data) => {
        newHostAssigned = true;
        newHostUserId = data.newHostUserId;
        res();
      });
    });

    hostClient.disconnect();
    await Promise.race([hostChangePromise, new Promise((r) => setTimeout(r, 1000))]);

    addResult(
      'Chuyển giao quyền Host khi Host thoát',
      newHostAssigned,
      `Host mới được server chuyển giao cho: ${newHostUserId || viewerClient.id}`
    );

    // -------------------------------------------------------------
    // Test 11: Thành viên cuối cùng rời phòng -> Dọn sạch RAM activeRooms
    // -------------------------------------------------------------
    viewerClient.disconnect();
    viewer2Client.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    const finalRooms = getActiveRooms();
    const isCleanedUp = !finalRooms.has(ROOM_CODE);

    addResult(
      'Dọn dẹp RAM khi phòng kết thúc',
      isCleanedUp,
      `Phòng ${ROOM_CODE} đã được xóa hoàn toàn khỏi RAM activeRooms (còn tồn tại: ${finalRooms.has(ROOM_CODE)})`
    );

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy test:', err);
  } finally {
    if (hostClient?.connected) hostClient.disconnect();
    if (viewerClient?.connected) viewerClient.disconnect();
    if (viewer2Client?.connected) viewer2Client.disconnect();

    server.close();
    console.log('\n[Teardown] Đã đóng test server.');
  }

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ:');
  console.table(
    results.map((r) => ({
      'Hạng mục kiểm tra': r.testName,
      'Kết quả': r.passed ? 'ĐẠT' : 'KHÔNG ĐẠT',
      'Chi tiết kiểm tra': r.details
    }))
  );
  console.log('================================================================\n');

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log('🎉 TOÀN BỘ 11/11 TIÊU CHÍ KIỂM THỬ GIAI ĐOẠN 1 ĐỀU ĐẠT CHUẨN!');
    process.exit(0);
  } else {
    console.error('⚠️ Có tiêu chí chưa đạt, vui lòng kiểm tra lại log.');
    process.exit(1);
  }
}

runTests();
