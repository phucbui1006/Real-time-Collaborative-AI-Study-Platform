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
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file PDF hoặc PPTX.'))
    }
  },
})

module.exports = { upload }
