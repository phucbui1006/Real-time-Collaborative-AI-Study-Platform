// controllers/documentController.js — Xử lý Upload & Bóc tách file PDF/PPTX

const { supabaseAdmin } = require('../config/supabase')
const { extractTextFromPDF } = require('../services/pdfService')

/**
 * POST /api/documents/upload
 * 1. Nhận file qua multer (req.file.buffer)
 * 2. Upload lên Supabase Storage
 * 3. Bóc tách text từng trang bằng pdf-parse
 * 4. Lưu metadata + nội dung vào DB
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file được gửi lên.' })

    const filename = `${Date.now()}-${req.file.originalname}`

    // Upload lên Supabase Storage bucket "slides"
    const { error: uploadError } = await supabaseAdmin.storage
      .from('slides')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype })

    if (uploadError) throw uploadError

    // Bóc tách nội dung text từ PDF
    const pages = await extractTextFromPDF(req.file.buffer)

    // Lưu metadata vào bảng documents
    const { data, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({ filename, original_name: req.file.originalname, pages_content: pages })
      .select()
      .single()

    if (dbError) throw dbError

    res.status(201).json({ success: true, document: data })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/documents
 * Lấy danh sách tài liệu (TODO: lọc theo user_id khi có Auth)
 */
async function getDocuments(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, filename, original_name, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, documents: data })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadDocument, getDocuments }
