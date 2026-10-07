// config/gemini.js — Cấu hình Google Gemini AI SDK

const { GoogleGenAI } = require('@google/genai')
const { GEMINI_API_KEY } = require('./env')

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

/**
 * Lấy model Gemini Flash (nhanh & miễn phí ở tier cơ bản)
 * Dùng gemini-2.0-flash-exp để có JSON Structured Output tốt nhất
 */
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    responseMimeType: 'application/json',
  },
})

module.exports = { geminiModel }
