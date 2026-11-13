// client/api/documents/upload-images.js
// Vercel Serverless Function — Upload ảnh lên Supabase Storage bucket 'slides' (có xác thực JWT & magic bytes)
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const MAX_IMAGE_BATCH = 10;
const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB/ảnh

const STATIC_ALLOWED_ORIGINS = new Set(
  [
    process.env.CLIENT_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    'https://permind.io.vn',
    'https://www.permind.io.vn',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ]
    .map((u) => (u || '').trim().replace(/\/$/, ''))
    .filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/$/, '');
  if (STATIC_ALLOWED_ORIGINS.has(normalized)) return true;
  if (
    /^https:\/\/(?:permind|real-time-collaborative-ai-study(?:-[a-z0-9-]+)*)(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
      normalized
    )
  ) {
    return true;
  }
  return false;
}

function detectImageSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', contentType: 'image/png' };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }

  const header6 = buffer.subarray(0, 6).toString('ascii');
  if (header6 === 'GIF87a' || header6 === 'GIF89a') {
    return { ext: 'gif', contentType: 'image/gif' };
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }

  return null;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With'
  );

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).end();
    }
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: 'Origin không được phép.' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ success: false, message: 'Cấu hình máy chủ lưu trữ chưa hoàn tất.' });
  }

  try {
    // Bắt buộc xác thực Supabase Access Token từ header Authorization
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để tải ảnh lên.' });
    }
    const token = match[1].trim();
    if (!token || token.length > 4096) {
      return res.status(401).json({ success: false, message: 'Token xác thực không hợp lệ.' });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: userData, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    // Nếu không có service role key ở môi trường này, dùng client gắn token user để tuân thủ RLS
    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? supabaseClient
      : createClient(SUPABASE_URL, SUPABASE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

    const { images } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ảnh rỗng.' });
    }

    if (images.length > MAX_IMAGE_BATCH) {
      return res.status(400).json({
        success: false,
        message: `Mỗi lần chỉ được tải lên tối đa ${MAX_IMAGE_BATCH} ảnh.`,
      });
    }

    const results = [];
    const now = Date.now();
    const userId = userData.user.id;

    for (let i = 0; i < images.length; i++) {
      const item = images[i] || {};
      try {
        if (typeof item.base64 !== 'string') {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh không hợp lệ.' });
          continue;
        }

        const rawBase64 = item.base64
          .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          .replace(/\\/g, '')
          .replace(/\s+/g, '');

        if (!rawBase64) {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh rỗng.' });
          continue;
        }

        const buffer = Buffer.from(rawBase64, 'base64');
        if (buffer.length > MAX_SINGLE_IMAGE_BYTES) {
          results.push({ index: i, success: false, error: 'Kích thước ảnh vượt quá giới hạn 3MB.' });
          continue;
        }

        const detected = detectImageSignature(buffer);
        if (!detected) {
          results.push({
            index: i,
            success: false,
            error: 'Chỉ chấp nhận file ảnh PNG, JPEG, WEBP hoặc GIF hợp lệ.',
          });
          continue;
        }

        const randomStr = crypto.randomBytes(6).toString('hex');
        const filename = `doc-images/${userId}/img_${now}_${i}_${randomStr}.${detected.ext}`;

        const { error: upErr } = await storageClient.storage
          .from('slides')
          .upload(filename, buffer, { contentType: detected.contentType, upsert: false });

        if (upErr) {
          console.warn(`Lỗi upload ảnh vị trí ${i}:`, upErr.message);
          results.push({ index: i, success: false, error: 'Không thể lưu hình ảnh lên máy chủ.' });
        } else {
          const { data: urlData } = storageClient.storage.from('slides').getPublicUrl(filename);
          results.push({ index: i, success: true, url: urlData.publicUrl });
        }
      } catch (err) {
        console.warn(`Lỗi giải mã ảnh vị trí ${i}:`, err?.message || err);
        results.push({ index: i, success: false, error: 'Dữ liệu ảnh không thể xử lý.' });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Lỗi serverless function upload images:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý hình ảnh.' });
  }
};
