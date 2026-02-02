import request from './request';

/** 获取大屏配置 */
export function getScreenConfig() {
  return request.get('/api/screen-config').then((res) => res.data);
}

/** 保存大屏配置 */
export function saveScreenConfig(data) {
  return request.post('/api/screen-config', data).then((res) => res.data);
}
