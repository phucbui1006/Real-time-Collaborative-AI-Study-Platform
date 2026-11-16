// client/api/auth/[action].js
// Vercel Serverless Function cho các endpoint /api/auth/login, /api/auth/check-username, /api/auth/forgot-password
// Dùng SUPABASE_SERVICE_ROLE_KEY ở môi trường server, không bao giờ lộ ra client.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const GENERIC_LOGIN_ERROR = 'Tên đăng nhập hoặc mật khẩu không đúng';
const GENERIC_FORGOT_MESSAGE = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu';

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'peermind', 'permind', 'moderator', 'mod', 'staff', 'official',
  'api', 'auth', 'login', 'register', 'logout', 'settings',
  'profile', 'user', 'users', 'guest', 'anonymous', 'null', 'undefined',
  'supabase', 'google', 'security', 'bot', 'ai', 'teacher', 'host',
]);

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bộ nhớ Rate Limit trong mỗi instance Serverless (kết hợp theo IP và theo tên đăng nhập)
const rateBuckets = new Map();

function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now > entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

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
  if (!origin) return true;
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

function getAdminClient() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function resolveUserByIdentifier(supabaseAdmin, identifier) {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean || clean.length > 160) return null;

  try {
    const { data, error } = await supabaseAdmin.rpc('resolve_user_auth_info', {
      p_identifier: clean,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0];
      return {
        userId: row.user_id,
        email: row.email,
        username: row.username,
        hasPassword: Boolean(row.has_password),
        providers: Array.isArray(row.providers) ? row.providers : [],
      };
    }
  } catch {}

  if (clean.includes('@')) {
    if (!EMAIL_REGEX.test(clean)) return null;
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = listData?.users?.find((u) => (u.email || '').toLowerCase() === clean);
        if (found) {
          const providers = Array.isArray(found.identities)
            ? found.identities.map((id) => id.provider).filter(Boolean)
            : found.app_metadata?.providers || [];
          return {
            userId: found.id,
            email: found.email,
            username: found.user_metadata?.username || null,
            hasPassword: providers.includes('email'),
            providers,
          };
        }
      } catch {}
    }
    return null;
  }

  if (SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('id, username')
        .ilike('username', clean)
        .maybeSingle();

      if (profileRow?.id) {
        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profileRow.id);
        if (userRes?.user) {
          const u = userRes.user;
          const providers = Array.isArray(u.identities)
            ? u.identities.map((id) => id.provider).filter(Boolean)
            : u.app_metadata?.providers || [];
          return {
            userId: u.id,
            email: u.email,
            username: profileRow.username,
            hasPassword: providers.includes('email'),
            providers,
          };
        }
      }
    } catch {}
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, error: 'Origin không được phép.' });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, error: 'Chưa cấu hình khóa kết nối máy chủ.' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const action = String(req.query?.action || '').trim().toLowerCase();

  // 1. CHECK USERNAME
  if (action === 'check-username') {
    if (!checkRateLimit(`chk:${ip}`, 45, 60 * 1000)) {
      return res.status(429).json({
        available: false,
        reason: 'rate_limit',
        message: 'Thao tác quá nhanh, vui lòng chờ giây lát.',
      });
    }

    const rawUsername = String(req.query?.username ?? req.body?.username ?? '').trim().toLowerCase();
    if (rawUsername.length < 3 || rawUsername.length > 20) {
      return res.status(200).json({
        available: false,
        reason: 'invalid_length',
        message: 'Tên người dùng phải từ 3 đến 20 ký tự.',
      });
    }
    if (!USERNAME_REGEX.test(rawUsername)) {
      return res.status(200).json({
        available: false,
        reason: 'invalid_chars',
        message: 'Tên người dùng chỉ được chứa chữ thường (a-z), số (0-9) và dấu gạch dưới (_).',
      });
    }
    if (RESERVED_USERNAMES.has(rawUsername)) {
      return res.status(200).json({
        available: false,
        reason: 'reserved',
        message: 'Tên người dùng này nằm trong danh sách không được phép sử dụng.',
      });
    }

    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('check_username_available', {
        p_username: rawUsername,
      });
      if (!rpcErr && rpcData && typeof rpcData.available === 'boolean') {
        return res.status(200).json(rpcData);
      }
    } catch {}

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', rawUsername)
      .limit(1);

    if (Array.isArray(data) && data.length > 0) {
      return res.status(200).json({
        available: false,
        reason: 'taken',
        message: 'Tên này đã có người dùng',
      });
    }

    return res.status(200).json({
      available: true,
      reason: 'ok',
      message: 'Tên người dùng hợp lệ',
    });
  }

  // 2. LOGIN WITH IDENTIFIER (USERNAME OR EMAIL)
  if (action === 'login' && req.method === 'POST') {
    const { identifier, password } = req.body || {};
    const cleanId = String(identifier || '').trim().toLowerCase().slice(0, 100);

    if (
      !checkRateLimit(`login_ip:${ip}`, 15, 15 * 60 * 1000) ||
      (cleanId && !checkRateLimit(`login_id:${cleanId}`, 8, 10 * 60 * 1000))
    ) {
      return res.status(429).json({
        success: false,
        error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.',
      });
    }

    if (!cleanId || typeof password !== 'string' || !password || password.length > 256) {
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    let targetEmail = null;
    if (cleanId.includes('@')) {
      if (!EMAIL_REGEX.test(cleanId)) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
      targetEmail = cleanId;
    } else {
      if (!USERNAME_REGEX.test(cleanId)) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
      const resolved = await resolveUserByIdentifier(supabaseAdmin, cleanId);
      if (!resolved?.email) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
      }
      targetEmail = resolved.email;
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR });
    }

    return res.status(200).json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      user: data.user,
    });
  }

  // 3. FORGOT PASSWORD
  if (action === 'forgot-password' && req.method === 'POST') {
    const { identifier, redirectTo } = req.body || {};
    const cleanId = String(identifier || '').trim().toLowerCase().slice(0, 100);

    if (!checkRateLimit(`forgot:${ip}:${cleanId}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        error: 'Bạn đã gửi quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau 15 phút.',
      });
    }

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tên người dùng hoặc email hợp lệ.',
      });
    }

    const resolved = await resolveUserByIdentifier(supabaseAdmin, cleanId);
    if (resolved && resolved.providers.includes('google') && !resolved.hasPassword) {
      return res.status(200).json({
        success: true,
        isGoogleOnly: true,
        message:
          'Tài khoản này được đăng ký bằng Google và chưa thiết lập mật khẩu riêng. Vui lòng bấm "Tiếp tục với Google" để đăng nhập.',
      });
    }

    const targetEmail = resolved?.email || (EMAIL_REGEX.test(cleanId) ? cleanId : null);
    if (targetEmail) {
      const defaultOrigin = process.env.CLIENT_URL || 'https://permind.io.vn';
      let safeRedirect = `${defaultOrigin.replace(/\/$/, '')}/reset-password`;
      if (typeof redirectTo === 'string' && /^https?:\/\//i.test(redirectTo)) {
        try {
          const parsed = new URL(redirectTo);
          if (
            parsed.hostname === 'permind.io.vn' ||
            parsed.hostname === 'www.permind.io.vn' ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname.endsWith('.vercel.app')
          ) {
            safeRedirect = redirectTo;
          }
        } catch {}
      }
      try {
        await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, { redirectTo: safeRedirect });
      } catch {}
    }

    return res.status(200).json({
      success: true,
      isGoogleOnly: false,
      message: GENERIC_FORGOT_MESSAGE,
    });
  }

  return res.status(404).json({ success: false, error: 'Endpoint không tồn tại.' });
}
