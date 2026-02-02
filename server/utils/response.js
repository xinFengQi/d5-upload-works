/**
 * API 响应格式化
 */
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
};
