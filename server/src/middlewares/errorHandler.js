// middlewares/errorHandler.js — Bắt lỗi toàn cục, ngăn server crash

/**
 * errorHandler — Express global error handler.
 * Phải có 4 tham số (err, req, res, next) để Express nhận ra là error handler.
 */
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Lỗi máy chủ nội bộ.'

  console.error(`[PeerMind Error] ${statusCode}: ${message}`)

  res.status(statusCode).json({
    success: false,
    error: message,
  })
}

module.exports = { errorHandler }
