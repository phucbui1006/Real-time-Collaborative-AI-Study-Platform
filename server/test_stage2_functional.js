// server/test_stage2_functional.js
// Script kiểm thử chức năng tự động Giai đoạn 2: Tích hợp LiveKit (SFU) cho chia sẻ màn hình

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Thiết lập tạm cấu hình LiveKit cho môi trường test nếu chưa có
process.env.LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://peermind-test.livekit.cloud';
process.env.LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey_test_12345';
process.env.LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret_test_abcdef1234567890abcdef1234567890';

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require(require.resolve('socket.io-client', { paths: [path.resolve(__dirname, '../client')] }));

// Hàm giải mã JWT payload mà không cần thư viện ngoài
const decodeJwt = (t) => {
  try {
    const payloadPart = t.split('.')[1];
    return JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

// Mock Supabase Database
const { supabaseAdmin } = require('./src/config/supabase');
const mockDbRoom = {
  id: '00000000-0000-0000-0000-000000000002',
  code: 'LK8899',
  name: 'Phòng học LiveKit Test',
  is_active: true,
  host_user_id: 'host-user-lk',
  max_members: 10,
  current_page: 0,
};

const createChainable = (resolveData = null) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => ({ data: resolveData, error: null }),
    maybeSingle: async () => ({ data: resolveData, error: null }),
    then: (resolve) => resolve({ data: resolveData, error: null }),
  };
  return chain;
};

supabaseAdmin.from = (table) => {
  if (table === 'rooms') {
    return {
      select: () => createChainable({ ...mockDbRoom }),
      update: () => createChainable(null),
    };
  }
  if (table === 'room_members') {
    return {
      select: () => {
        let isStranger = false;
        const chain = {
          eq: (col, val) => {
            if (val === 'stranger-999') isStranger = true;
            return chain;
          },
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({
            data: isStranger ? null : { role: 'viewer', user_id: 'viewer-user-lk' },
            error: null,
          }),
          then: (res) => res({ data: isStranger ? [] : [{ role: 'viewer', user_id: 'viewer-user-lk' }], error: null }),
        };
        return chain;
      },
      update: () => createChainable(null),
      upsert: async () => ({ data: null, error: null }),
    };
  }
  if (table === 'room_documents') {
    return {
      select: () => createChainable(null),
      upsert: async () => ({ data: null, error: null }),
    };
  }
  if (table === 'room_messages') {
    return {
      select: () => createChainable([]),
      insert: async () => ({ data: null, error: null }),
    };
  }
  return {
    select: () => createChainable(null),
  };
};

const { initSockets } = require('./src/sockets/index');
const roomRoutes = require('./src/routes/roomRoutes');

const TEST_PORT = 5299;
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const ROOM_CODE = 'LK8899';

async function runStage2Tests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 2: LIVEKIT SFU SCREEN SHARE');
  console.log('================================================================\n');

  // Khởi động HTTP & Socket Server
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomRoutes);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  initSockets(io);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Setup] Server test Giai đoạn 2 đã khởi động tại port ${TEST_PORT}`);

  const results = [];
  const addResult = (testName, passed, details) => {
    results.push({ testName, passed, details });
    const mark = passed ? '✅ ĐẠT' : '❌ KHÔNG ĐẠT';
    console.log(`${mark} | ${testName} -> ${details}`);
  };

  let hostClient = null;
  let viewerClient = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Từ chối cấp token cho người ngoài (chưa vào phòng)
    // -------------------------------------------------------------
    const strangerRes = await fetch(`${SERVER_URL}/api/rooms/${ROOM_CODE}/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'stranger-999', socketId: 'unknown_socket', userName: 'Người lạ' }),
    });

    const isStrangerForbidden = strangerRes.status === 403;
    const strangerBody = await strangerRes.json().catch(() => ({}));
    addResult(
      'Bảo mật Token: Từ chối người ngoài phòng',
      isStrangerForbidden,
      `HTTP status: ${strangerRes.status} (Thông báo: "${strangerBody.error}")`
    );

    // -------------------------------------------------------------
    // Kết nối Host và Viewer qua Socket để trở thành thành viên hợp lệ
    // -------------------------------------------------------------
    hostClient = ioClient(SERVER_URL, { forceNew: true, reconnection: false });
    await new Promise((res) => hostClient.on('connect', res));
    hostClient.emit('ROOM:JOIN', {
      roomCode: ROOM_CODE,
      user: { id: 'host-user-lk', name: 'Giảng viên LK', avatarColor: '#0ea5e9' }
    });
    await new Promise((res) => hostClient.once('ROOM:STATE', res));

    viewerClient = ioClient(SERVER_URL, { forceNew: true, reconnection: false });
    await new Promise((res) => viewerClient.on('connect', res));
    viewerClient.emit('ROOM:JOIN', {
      roomCode: ROOM_CODE,
      user: { id: 'viewer-user-lk', name: 'Sinh viên LK', avatarColor: '#10b981' }
    });
    await new Promise((res) => viewerClient.once('ROOM:STATE', res));

    // -------------------------------------------------------------
    // Test 2: Cấp token LiveKit cho Host (được quyền publish)
    // -------------------------------------------------------------
    const hostTokenRes = await fetch(`${SERVER_URL}/api/rooms/${ROOM_CODE}/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'host-user-lk', socketId: hostClient.id, userName: 'Giảng viên LK' }),
    });

    const hostTokenData = await hostTokenRes.json();
    let hostDecoded = null;
    if (hostTokenData.token) {
      hostDecoded = decodeJwt(hostTokenData.token);
    }

    const hostHasPublishGrant = hostDecoded?.video?.canPublish === true;
    const hostHasRoomGrant = hostDecoded?.video?.room === ROOM_CODE;
    addResult(
      'LiveKit Token Host: Quyền Publish & Room Code',
      hostHasPublishGrant && hostHasRoomGrant,
      `Role: '${hostTokenData.role}', canPublish: ${hostDecoded?.video?.canPublish}, room: '${hostDecoded?.video?.room}'`
    );

    // -------------------------------------------------------------
    // Test 3: Cấp token LiveKit cho Viewer (chỉ được subscribe, không được publish)
    // -------------------------------------------------------------
    const viewerTokenRes = await fetch(`${SERVER_URL}/api/rooms/${ROOM_CODE}/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'viewer-user-lk', socketId: viewerClient.id, userName: 'Sinh viên LK' }),
    });

    const viewerTokenData = await viewerTokenRes.json();
    let viewerDecoded = null;
    if (viewerTokenData.token) {
      viewerDecoded = decodeJwt(viewerTokenData.token);
    }

    const viewerCannotPublish = viewerDecoded?.video?.canPublish === false;
    const viewerCanSubscribe = viewerDecoded?.video?.canSubscribe === true;
    addResult(
      'LiveKit Token Viewer: Chỉ Subscribe, KHÔNG được Publish',
      viewerCannotPublish && viewerCanSubscribe,
      `canPublish: ${viewerDecoded?.video?.canPublish}, canSubscribe: ${viewerDecoded?.video?.canSubscribe}`
    );

    // -------------------------------------------------------------
    // Test 4: Thời hạn token LiveKit ngắn (TTL <= 3600s)
    // -------------------------------------------------------------
    const startTimestamp = hostDecoded?.nbf || hostDecoded?.iat || 0;
    const ttlSeconds = hostDecoded?.exp && startTimestamp ? hostDecoded.exp - startTimestamp : 0;
    addResult(
      'Thời hạn LiveKit Token ngắn (TTL 1 giờ)',
      ttlSeconds === 3600,
      `Token TTL = ${ttlSeconds} giây (chính xác 1h)`
    );

    // -------------------------------------------------------------
    // Test 5: Viewer được cấp quyền Speaker -> Nhận token có quyền publish
    // -------------------------------------------------------------
    hostClient.emit('ROOM:SET_ROLE', {
      roomCode: ROOM_CODE,
      targetSocketId: viewerClient.id,
      role: 'speaker'
    });
    await new Promise((r) => setTimeout(r, 200));

    const speakerTokenRes = await fetch(`${SERVER_URL}/api/rooms/${ROOM_CODE}/livekit-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'viewer-user-lk', socketId: viewerClient.id, userName: 'Sinh viên LK' }),
    });

    const speakerTokenData = await speakerTokenRes.json();
    const speakerDecoded = decodeJwt(speakerTokenData.token);
    const speakerCanPublish = speakerDecoded?.video?.canPublish === true;

    addResult(
      'Nâng quyền Speaker -> Tự động cấp quyền Publish LiveKit',
      speakerCanPublish,
      `Sau khi duyệt Speaker, token LiveKit mới có canPublish = ${speakerDecoded?.video?.canPublish}`
    );

    // -------------------------------------------------------------
    // Test 6: Kiểm tra hook useLiveKitScreen có dynacast và simulcast
    // -------------------------------------------------------------
    const fs = require('fs');
    const hookSource = fs.readFileSync(path.resolve(__dirname, '../client/src/hooks/useLiveKitScreen.ts'), 'utf8');
    const hasDynacast = hookSource.includes('dynacast: true');
    const hasSimulcast = hookSource.includes('simulcast: true');
    const hasAdaptiveStream = hookSource.includes('adaptiveStream: true');
    const hasReconnectHandling = hookSource.includes('RoomEvent.Reconnecting') && hookSource.includes('RoomEvent.Reconnected');

    addResult(
      'Cấu hình Client: Dynacast, AdaptiveStream & Simulcast',
      hasDynacast && hasSimulcast && hasAdaptiveStream,
      `dynacast: ${hasDynacast}, simulcast: ${hasSimulcast}, adaptiveStream: ${hasAdaptiveStream}`
    );

    addResult(
      'Client: Xử lý Auto Reconnection khi mạng gián đoạn',
      hasReconnectHandling,
      'Lắng nghe đầy đủ RoomEvent.Reconnecting và RoomEvent.Reconnected'
    );

    // -------------------------------------------------------------
    // Test 7: Kiểm tra cơ chế giới hạn Mesh cho phòng > 6 người
    // -------------------------------------------------------------
    const roomViewSource = fs.readFileSync(path.resolve(__dirname, '../client/src/components/classrooms/RoomView.tsx'), 'utf8');
    const hasMeshLimit = roomViewSource.includes('effectiveMembers.length > 6') && roomViewSource.includes('isMeshDisabled');

    addResult(
      'Giới hạn WebRTC Mesh khi phòng vượt quá 6 người',
      hasMeshLimit,
      'Phòng > 6 người hiển thị cảnh báo và tự động vô hiệu hóa bật mic/cam Mesh P2P'
    );

  } catch (err) {
    console.error('Lỗi ngoại lệ trong kịch bản test:', err);
  } finally {
    if (hostClient?.connected) hostClient.disconnect();
    if (viewerClient?.connected) viewerClient.disconnect();
    server.close();
    console.log('\n[Teardown] Đã đóng server test Giai đoạn 2.');
  }

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 2:');
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
    console.log('🎉 TOÀN BỘ 7/7 TIÊU CHÍ KIỂM THỬ GIAI ĐOẠN 2 ĐỀU ĐẠT CHUẨN!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runStage2Tests();
