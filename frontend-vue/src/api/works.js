import request from './request';

/** 作品列表 */
export function getWorks(params = {}) {
  return request.get('/api/works', { params: { page: 1, limit: 100, ...params } }).then((res) => res.data);
}

/** Top 作品（投票结果页） */
export function getWorksTop(limit = 10) {
  return request.get('/api/works/top', { params: { limit } }).then((res) => res.data);
}

/** 按奖项类型获取作品（投票结果页，带 type 标识） */
export function getWorksByAward(type = 'popular', limit = 10) {
  return request.get('/api/works/by-award', { params: { type, limit } }).then((res) => res.data);
}

/** 校验作品标题是否可用（上传前调用，避免上传后才发现重复） */
export function checkWorkTitle(title) {
  return request.get('/api/works/check-title', { params: { title: (title || '').trim() } }).then((res) => res.data);
}

/** 删除作品 */
export function deleteWork(id) {
  return request.delete(`/api/works/${id}`).then((res) => res.data);
}
