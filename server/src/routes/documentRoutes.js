// routes/documentRoutes.js — /api/documents

const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const { upload } = require('../middlewares/uploadMiddleware')
const { uploadDocument, getDocuments, deleteDocument, uploadDocumentImages } = require('../controllers/documentController')

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Tải lên quá nhanh, vui lòng đợi vài phút.' },
})

router.use(requireAuth)

// POST /api/documents/upload — Upload slide PDF/PPTX
router.post('/upload', uploadLimiter, upload.single('file'), uploadDocument)

// POST /api/documents/upload-images — Tách và upload ảnh trích xuất từ tài liệu lên Storage
router.post('/upload-images', uploadLimiter, uploadDocumentImages)

// GET  /api/documents — Lấy danh sách tài liệu của user
router.get('/', getDocuments)

// DELETE /api/documents/:id — Xóa tài liệu của user
router.delete('/:id', deleteDocument)

module.exports = router
