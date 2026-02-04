import request from './request';

/** 获取当前评委对各作品的评分 */
export function getMyScores() {
  return request.get('/api/judge/my-scores').then((res) => res.data);
}

/** 评委评分列表：作品列表 + 评委评分（作品维度）+ 我的打分 */
export function getJudgeWorks(params = {}) {
  return request.get('/api/judge/works', { params }).then((res) => res.data);
}

/** 提交/更新评分（双维度：创意与概念 0–50，艺术与观感 0–50） */
export function submitScore(workId, creativityScore, artScore) {
  return request.post('/api/judge/score', { workId, creativityScore, artScore }).then((res) => res.data);
}

/** 某作品的评委评分明细（管理员或评委可查看） */
export function getWorkJudgeScores(workId) {
  return request.get(`/api/judge/works/${workId}/scores`).then((res) => res.data);
}
