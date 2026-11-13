// config/gemini.js — Cấu hình Google Gemini AI SDK (Tùy chọn)
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GEMINI_API_KEY } = require('./env')

let genAI = null
let geminiModel = null
let geminiTextModel = null

const isConfigured =
  Boolean(GEMINI_API_KEY) &&
  GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
  GEMINI_API_KEY.trim().length > 10

if (isConfigured) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })
    geminiTextModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    })
    console.log('[Permind] ✅ Google Gemini AI đã được kích hoạt thành công.')
  } catch (err) {
    console.warn('[Permind] ⚠️ Không thể kết nối Gemini AI:', err.message)
  }
}

/**
 * Tạo model theo systemInstruction riêng cho từng tác vụ AI (chống prompt injection)
 */
function createScopedModel(systemInstruction, expectJson = false) {
  if (!genAI) return null
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction,
    ...(expectJson ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
  })
}

module.exports = { geminiModel, geminiTextModel, createScopedModel }
