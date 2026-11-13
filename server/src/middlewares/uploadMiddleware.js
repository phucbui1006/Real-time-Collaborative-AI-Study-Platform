// middlewares/uploadMiddleware.js — Giới hạn file upload bằng Multer

const multer = require('multer')

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]
const MAX_SIZE_MB = 20

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase()
    const hasAllowedExt = ext.endsWith('.pdf') || ext.endsWith('.pptx') || ext.endsWith('.ppt')
    if (ALLOWED_MIMETYPES.includes(file.mimetype) && hasAllowedExt) {
      cb(null, true)
    } else {
      const err = new Error('Chỉ chấp nhận file PDF hoặc PPTX.')
      err.statusCode = 400
      cb(err)
    }
  },
})

/**
 * Kiểm tra magic bytes thực tế của buffer file PDF/PPTX/PPT để chống giả mạo MIME type
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {boolean}
 */
function hasValidDocumentSignature(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false

  // PDF: %PDF
  if (mimetype === 'application/pdf') {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF'
  }
  // PPTX (ZIP OOXML): PK\x03\x04
  if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
  }
  // PPT cũ (OLE2 Compound File): D0 CF 11 E0
  if (mimetype === 'application/vnd.ms-powerpoint') {
    return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0
  }
  return false
}

/**
 * Kiểm tra magic bytes của file ảnh (PNG, JPEG, WEBP, GIF) — từ chối SVG/HTML/executable
 * @param {Buffer} buffer
 * @returns {{ ext: string, contentType: string } | null}
 */
function detectImageSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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
    return { ext: 'png', contentType: 'image/png' }
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' }
  }

  // GIF: GIF87a hoặc GIF89a
  const header6 = buffer.subarray(0, 6).toString('ascii')
  if (header6 === 'GIF87a' || header6 === 'GIF89a') {
    return { ext: 'gif', contentType: 'image/gif' }
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' }
  }

  return null
}

module.exports = { upload, hasValidDocumentSignature, detectImageSignature }
