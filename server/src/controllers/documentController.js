// controllers/documentController.js — Xử lý Upload & Bóc tách file PDF/PPTX

const { supabaseAdmin } = require('../config/supabase')
const { extractTextFromPDF } = require('../services/pdfService')

/**
 * POST /api/documents/upload
 * 1. Nhận file qua multer (req.file.buffer)
 * 2. Upload lên Supabase Storage bucket 'slides'
 * 3. Bóc tách text từng trang bằng pdf-parse
 * 4. Lưu metadata + nội dung vào bảng documents
 */
async function uploadDocument(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Không có file được gửi lên.' })

    const timestamp = Date.now()
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${sanitizedName}`

    // Upload lên Supabase Storage bucket "slides"
    const { error: uploadError } = await supabaseAdmin.storage
      .from('slides')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: true })

    if (uploadError) {
      console.warn('Storage upload warning:', uploadError.message)
    }

    // Lấy public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('slides')
      .getPublicUrl(filename)

    // Bóc tách nội dung text từ PDF nếu có thể
    let pages = []
    try {
      if (req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
        pages = await extractTextFromPDF(req.file.buffer)
      } else {
        pages = [req.file.originalname]
      }
    } catch (e) {
      console.warn('PDF extract warning:', e.message)
      pages = ['Nội dung tài liệu đang được phân tích']
    }

    const subject = req.body.subject || 'Chung'
    const total_pages = pages.length || 1

    // Lưu metadata vào bảng documents
    const { data, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        filename,
        original_name: req.file.originalname,
        subject,
        total_pages,
        file_url: urlData?.publicUrl || null,
        pages_content: pages,
      })
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
 * Lấy danh sách tài liệu từ Supabase DB
 */
async function getDocuments(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, documents: data })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/documents/:id
 * Xóa tài liệu khỏi Supabase DB
 */
async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('documents').delete().eq('id', id)
    if (error) throw error
    res.json({ success: true, message: 'Đã xóa tài liệu.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadDocument, getDocuments, deleteDocument }
