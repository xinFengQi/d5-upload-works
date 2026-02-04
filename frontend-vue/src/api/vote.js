import request from './request';

/** 投票 */
export function vote(workId) {
  return request.post('/api/vote', { workId }).then((res) => res.data);
}

/** 取消投票 */
export function cancelVote(workId) {
  return request.delete('/api/vote', { params: { workId } }).then((res) => res.data);
}

/** 当前用户已投票数 */
export function getUserVoteCount() {
  return request.get('/api/vote/user/count').then((res) => res.data);
}

/** 某作品投票统计 */
export function getVoteStats(workId) {
  return request.get('/api/vote/stats', { params: { workId } }).then((res) => res.data);
}

/** 某作品投票用户列表（管理员） */
export function getVoteUsers(workId) {
  return request.get('/api/vote/users', { params: { workId } }).then((res) => res.data);
}
