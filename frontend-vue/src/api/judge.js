import request from './request';

/** 获取当前评委对各作品的评分 */
export function getMyScores() {
  return request.get('/api/judge/my-scores').then((res) => res.data);
}

/** 评委评分列表：作品列表 + 评委评分（作品维度）+ 我的打分 */
export function getJudgeWorks(params = {}) {
  return request.get('/api/judge/works', { params }).then((res) => res.data);
}

/** 提交/更新评分 */
export function submitScore(workId, score) {
  return request.post('/api/judge/score', { workId, score }).then((res) => res.data);
}

/** 获取作品分类选项（评委修改分类时使用） */
export function getCategories() {
  return request.get('/api/judge/categories').then((res) => res.data);
}

/** 评委修改作品分类 */
export function updateWorkCategory(workId, category) {
  return request.patch(`/api/judge/works/${workId}/category`, { category }).then((res) => res.data);
}

/** 某作品的评委评分明细（管理员或评委可查看） */
export function getWorkJudgeScores(workId) {
  return request.get(`/api/judge/works/${workId}/scores`).then((res) => res.data);
}
