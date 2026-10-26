// routes/documentRoutes.js — /api/documents

const express = require('express')
const router = express.Router()
const { upload } = require('../middlewares/uploadMiddleware')
const { uploadDocument, getDocuments, deleteDocument, uploadDocumentImages } = require('../controllers/documentController')

// POST /api/documents/upload — Upload slide PDF/PPTX
router.post('/upload', upload.single('file'), uploadDocument)

// POST /api/documents/upload-images — Tách và upload ảnh trích xuất từ tài liệu lên Storage
router.post('/upload-images', uploadDocumentImages)

// GET  /api/documents — Lấy danh sách tài liệu
router.get('/', getDocuments)

// DELETE /api/documents/:id — Xóa tài liệu
router.delete('/:id', deleteDocument)

module.exports = router
