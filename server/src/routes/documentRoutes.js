// routes/documentRoutes.js — /api/documents

const express = require('express')
const router = express.Router()
const { upload } = require('../middlewares/uploadMiddleware')
const { uploadDocument, getDocuments } = require('../controllers/documentController')

// POST /api/documents/upload — Upload slide PDF/PPTX
router.post('/upload', upload.single('file'), uploadDocument)

// GET  /api/documents — Lấy danh sách tài liệu của user
router.get('/', getDocuments)

module.exports = router
