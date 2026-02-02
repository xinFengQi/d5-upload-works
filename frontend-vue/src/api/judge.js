import request from './request';

/** 获取当前评委对各作品的评分 */
export function getMyScores() {
  return request.get('/api/judge/my-scores').then((res) => res.data);
}

/** 提交/更新评分 */
export function submitScore(workId, score) {
  return request.post('/api/judge/score', { workId, score }).then((res) => res.data);
}
