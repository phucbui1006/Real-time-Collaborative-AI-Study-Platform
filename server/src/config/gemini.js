// config/gemini.js — Cấu hình Google Gemini AI SDK (Tùy chọn)
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { GEMINI_API_KEY } = require('./env')

let geminiModel = null

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here' && GEMINI_API_KEY.trim().length > 10) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })
    console.log('[PeerMind] ✅ Google Gemini AI đã được kích hoạt thành công.')
  } catch (err) {
    console.warn('[PeerMind] ⚠️ Không thể kết nối Gemini AI:', err.message)
  }
}

module.exports = { geminiModel }
