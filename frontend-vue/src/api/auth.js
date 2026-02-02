import request from './request';

/** 获取当前用户 */
export function getMe() {
  return request.get('/api/auth/me').then((res) => res.data);
}

/** 用 code/authCode 换 token（钉钉回调直接进前端时调用） */
export function exchangeCode(params) {
  return request.get('/api/auth/exchange', { params }).then((res) => res.data);
}

/** 管理员登录 */
export function adminLogin(password) {
  return request.post('/api/auth/admin', { password }).then((res) => res.data);
}

/** 退出登录 */
export function logout() {
  return request.post('/api/auth/logout').then((res) => res.data).catch(() => ({}));
}
