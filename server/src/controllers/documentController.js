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

/**
 * POST /api/documents/upload-images
 * Tách và lưu trữ hình ảnh trích xuất từ tài liệu lên Supabase Storage bucket 'slides'
 * Nhận payload: { images: [{ base64: string, mimeType?: string, filename?: string }] }
 * Trả về: { success: true, results: [{ index: number, success: boolean, url: string }] }
 */
async function uploadDocumentImages(req, res, next) {
  try {
    const { images } = req.body
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Không có hình ảnh để tải lên.' })
    }

    const results = []
    const now = Date.now()

    for (let i = 0; i < images.length; i++) {
      const item = images[i]
      try {
        const rawBase64 = (item.base64 || '')
          .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          .replace(/\\/g, '')
          .replace(/\s+/g, '')

        if (!rawBase64) {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh rỗng' })
          continue
        }

        const buffer = Buffer.from(rawBase64, 'base64')
        let ext = (item.mimeType || 'png').toLowerCase().replace('image/', '')
        if (ext === 'jpeg') ext = 'jpg'
        if (!ext || ext.length > 5) ext = 'png'

        const randomStr = Math.random().toString(36).substring(2, 8)
        const filename = `doc-images/img_${now}_${i}_${randomStr}.${ext}`
        const contentType = item.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`

        const { error: upErr } = await supabaseAdmin.storage
          .from('slides')
          .upload(filename, buffer, { contentType, upsert: true })

        if (upErr) {
          console.warn(`Lỗi upload ảnh vị trí ${i}:`, upErr.message)
          results.push({ index: i, success: false, error: upErr.message })
        } else {
          const { data: urlData } = supabaseAdmin.storage.from('slides').getPublicUrl(filename)
          results.push({ index: i, success: true, url: urlData.publicUrl })
        }
      } catch (err) {
        console.warn(`Lỗi giải mã ảnh vị trí ${i}:`, err.message)
        results.push({ index: i, success: false, error: err.message })
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadDocument, getDocuments, deleteDocument, uploadDocumentImages }
