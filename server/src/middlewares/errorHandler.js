// middlewares/errorHandler.js — Bắt lỗi toàn cục, ngăn server crash

/**
 * errorHandler — Express global error handler.
 * Phải có 4 tham số (err, req, res, next) để Express nhận ra là error handler.
 */
function errorHandler(err, _req, res, _next) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Kích thước file vượt quá giới hạn cho phép (20MB).',
    })
  }

  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500
  console.error(`[Permind Error] ${statusCode}:`, err?.message || err)

  const clientMessage =
    statusCode >= 500
      ? 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
      : err.exposeMessage || err.message || 'Yêu cầu không hợp lệ.'

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
  })
}

module.exports = { errorHandler }
