// client/api/documents/upload-images.js
// Vercel Serverless Function — Upload ảnh lên Supabase Storage bucket 'slides' với Service Role Key
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ohcnczeeiypefwckidon.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.warn('Cảnh báo: Thiếu SUPABASE_SERVICE_ROLE_KEY trong môi trường Vercel');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY || '');

module.exports = async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { images } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ảnh rỗng' });
    }

    const results = [];
    const now = Date.now();

    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      try {
        const rawBase64 = (item.base64 || '')
          .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          .replace(/\\/g, '')
          .replace(/\s+/g, '');

        if (!rawBase64) {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh rỗng' });
          continue;
        }

        const buffer = Buffer.from(rawBase64, 'base64');
        let ext = (item.mimeType || 'webp').toLowerCase().replace('image/', '');
        if (ext === 'jpeg') ext = 'jpg';
        if (!ext || ext.length > 5) ext = 'webp';

        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = `doc-images/img_${now}_${i}_${randomStr}.${ext}`;
        const contentType = item.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        const { error: upErr } = await supabaseAdmin.storage
          .from('slides')
          .upload(filename, buffer, { contentType, upsert: true });

        if (upErr) {
          console.warn(`Lỗi upload ảnh vị trí ${i}:`, upErr.message);
          results.push({ index: i, success: false, error: upErr.message });
        } else {
          const { data: urlData } = supabaseAdmin.storage.from('slides').getPublicUrl(filename);
          results.push({ index: i, success: true, url: urlData.publicUrl });
        }
      } catch (err) {
        console.warn(`Lỗi giải mã ảnh vị trí ${i}:`, err.message);
        results.push({ index: i, success: false, error: err.message });
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Lỗi serverless function upload images:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
