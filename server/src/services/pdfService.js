// services/pdfService.js — Bóc tách chữ từ tệp PDF (dùng pdf-parse)

const pdfParse = require('pdf-parse')

/**
 * extractTextFromPDF
 * @param {Buffer} buffer - Buffer của file PDF
 * @returns {Promise<string[]>} - Mảng nội dung văn bản theo từng trang
 */
async function extractTextFromPDF(buffer) {
  const pages = []

  await pdfParse(buffer, {
    pagerender: function (pageData) {
      return pageData.getTextContent().then((textContent) => {
        const text = textContent.items.map((item) => item.str).join(' ')
        pages.push(text)
        return text
      })
    },
  })

  // Fallback: nếu pagerender không hoạt động, dùng text tổng
  if (pages.length === 0) {
    const data = await pdfParse(buffer)
    pages.push(data.text)
  }

  return pages
}

module.exports = { extractTextFromPDF }
