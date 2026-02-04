/**
 * API 响应格式化
 */

/** 生产环境不向前端返回具体错误原因，仅打日志；开发环境可返回 err.message */
function safeErrorMessage(err, defaultMessage = '操作失败') {
  const isDev = process.env.ENVIRONMENT === 'development' || process.env.NODE_ENV === 'development';
  if (isDev && err && typeof err.message === 'string') return err.message;
  return defaultMessage;
}

function createSuccessResponse(data, status = 200) {
  return {
    success: true,
    data,
    _status: status,
  };
}

function createErrorResponse(message, code, status = 400, details = undefined) {
  return {
    success: false,
    error: { message, code, details },
    _status: status,
  };
}

function createPaginatedResponse(items, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return createSuccessResponse({
    items,
    total,
    page,
    limit,
    totalPages,
  });
}

function sendJson(res, payload) {
  const status = payload._status ?? 200;
  delete payload._status;
  res.status(status).json(payload);
}

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  sendJson,
  safeErrorMessage,
};
