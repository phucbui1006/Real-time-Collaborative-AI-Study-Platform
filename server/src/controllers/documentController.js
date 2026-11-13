// controllers/documentController.js — Xử lý Upload & Bóc tách file PDF/PPTX (kèm phân quyền & kiểm tra magic bytes)

const crypto = require('crypto')
const { supabaseAdmin } = require('../config/supabase')
const { extractTextFromPDF } = require('../services/pdfService')
const { hasValidDocumentSignature, detectImageSignature } = require('../middlewares/uploadMiddleware')

const MAX_IMAGE_BATCH = 10
const MAX_SINGLE_IMAGE_BYTES = 3 * 1024 * 1024 // 3MB/ảnh

/**
 * POST /api/documents/upload
 */
async function uploadDocument(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Không có file được gửi lên.' })
    }

    if (!hasValidDocumentSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Nội dung file không khớp với định dạng PDF/PPTX hợp lệ.',
      })
    }

    const timestamp = Date.now()
    const sanitizedName = (req.file.originalname || 'document')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 120)
    const filename = `${userId}/${timestamp}-${sanitizedName}`

    // Upload lên Supabase Storage bucket "slides"
    const { error: uploadError } = await supabaseAdmin.storage
      .from('slides')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false })

    if (uploadError) {
      console.warn('Storage upload warning:', uploadError.message)
    }

    const { data: urlData } = supabaseAdmin.storage.from('slides').getPublicUrl(filename)

    let pages = []
    try {
      if (
        req.file.mimetype === 'application/pdf' ||
        req.file.originalname.toLowerCase().endsWith('.pdf')
      ) {
        pages = await extractTextFromPDF(req.file.buffer)
      } else {
        pages = [req.file.originalname]
      }
    } catch (e) {
      console.warn('PDF extract warning:', e.message)
      pages = ['Nội dung tài liệu đang được phân tích']
    }

    const subject = String(req.body.subject || 'Chung').trim().slice(0, 80)
    const total_pages = pages.length || 1

    const { data, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        owner_user_id: userId,
        filename,
        original_name: String(req.file.originalname || sanitizedName).slice(0, 200),
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
 * GET /api/documents — Chỉ trả về tài liệu thuộc sở hữu của người dùng đang đăng nhập
 */
async function getDocuments(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' })
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, filename, original_name, subject, total_pages, file_url, created_at, owner_user_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, documents: data || [] })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/documents/:id — Chỉ cho phép xóa tài liệu của chính mình
 */
async function deleteDocument(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' })
    }

    const cleanId = String(req.params.id || '').trim()
    if (!cleanId || !/^[0-9a-fA-F-]+$/.test(cleanId)) {
      return res.status(400).json({ success: false, error: 'ID tài liệu không hợp lệ.' })
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', cleanId)
      .eq('owner_user_id', userId)
      .select('id, filename')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài liệu hoặc bạn không có quyền xóa.',
      })
    }

    if (data.filename) {
      await supabaseAdmin.storage.from('slides').remove([data.filename]).catch(() => {})
    }

    res.json({ success: true, message: 'Đã xóa tài liệu.' })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/documents/upload-images
 * Kiểm tra JWT, giới hạn số lượng & kích thước ảnh, kiểm tra magic bytes (chỉ nhận PNG/JPEG/WEBP/GIF)
 */
async function uploadDocumentImages(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Chưa xác thực người dùng.' })
    }

    const { images } = req.body || {}
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có hình ảnh để tải lên.' })
    }

    if (images.length > MAX_IMAGE_BATCH) {
      return res.status(400).json({
        success: false,
        error: `Mỗi lần chỉ được tải lên tối đa ${MAX_IMAGE_BATCH} ảnh.`,
      })
    }

    const results = []
    const now = Date.now()

    for (let i = 0; i < images.length; i++) {
      const item = images[i] || {}
      try {
        if (typeof item.base64 !== 'string') {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh không hợp lệ.' })
          continue
        }

        const rawBase64 = item.base64
          .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '')
          .replace(/\\/g, '')
          .replace(/\s+/g, '')

        if (!rawBase64) {
          results.push({ index: i, success: false, error: 'Dữ liệu ảnh rỗng.' })
          continue
        }

        const buffer = Buffer.from(rawBase64, 'base64')
        if (buffer.length > MAX_SINGLE_IMAGE_BYTES) {
          results.push({ index: i, success: false, error: 'Kích thước ảnh vượt quá giới hạn 3MB.' })
          continue
        }

        const detected = detectImageSignature(buffer)
        if (!detected) {
          results.push({
            index: i,
            success: false,
            error: 'Chỉ chấp nhận file ảnh PNG, JPEG, WEBP hoặc GIF hợp lệ.',
          })
          continue
        }

        const randomStr = crypto.randomBytes(6).toString('hex')
        const filename = `doc-images/${userId}/img_${now}_${i}_${randomStr}.${detected.ext}`

        const { error: upErr } = await supabaseAdmin.storage
          .from('slides')
          .upload(filename, buffer, { contentType: detected.contentType, upsert: false })

        if (upErr) {
          console.warn(`Lỗi upload ảnh vị trí ${i}:`, upErr.message)
          results.push({ index: i, success: false, error: 'Không thể lưu hình ảnh lên máy chủ.' })
        } else {
          const { data: urlData } = supabaseAdmin.storage.from('slides').getPublicUrl(filename)
          results.push({ index: i, success: true, url: urlData.publicUrl })
        }
      } catch (err) {
        console.warn(`Lỗi giải mã ảnh vị trí ${i}:`, err?.message || err)
        results.push({ index: i, success: false, error: 'Dữ liệu ảnh không thể xử lý.' })
      }
    }

    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadDocument, getDocuments, deleteDocument, uploadDocumentImages }
