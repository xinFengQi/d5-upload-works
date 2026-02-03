/**
 * 插入模拟数据（用户、作品、投票、评委评分）
 * 运行：node db/seed.js
 */
const { getDb } = require('./index');

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

// 模拟用户
const mockUsers = [
  { userid: 'mock_user_001', name: '张三', avatar: null, mobile: null, email: 'zhangsan@example.com', role: 'user', created_at: now - 30 * day },
  { userid: 'mock_user_002', name: '李四', avatar: null, mobile: null, email: 'lisi@example.com', role: 'user', created_at: now - 25 * day },
  { userid: 'mock_user_003', name: '王五', avatar: null, mobile: null, email: 'wangwu@example.com', role: 'user', created_at: now - 20 * day },
  { userid: 'mock_user_004', name: '赵六', avatar: null, mobile: null, email: 'zhaoliu@example.com', role: 'user', created_at: now - 15 * day },
  { userid: 'mock_user_005', name: '钱七', avatar: null, mobile: null, email: 'qianqi@example.com', role: 'user', created_at: now - 10 * day },
];

// 模拟作品（关联上述用户）
const mockWorks = [
  { id: 'work_mock_001', userid: 'mock_user_001', title: '城市夜景渲染', description: 'D5 渲染的现代都市夜景，灯光与建筑结合。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_001/work_mock_001.mp4', file_name: 'works/mock_user_001/work_mock_001.mp4', file_size: 15728640, file_type: 'video/mp4', creator_name: '张三', created_at: now - 28 * day, updated_at: now - 28 * day },
  { id: 'work_mock_002', userid: 'mock_user_002', title: '室内客厅漫游', description: '简约风格客厅，日光与材质表现。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_002/work_mock_002.mp4', file_name: 'works/mock_user_002/work_mock_002.mp4', file_size: 20971520, file_type: 'video/mp4', creator_name: '李四', created_at: now - 24 * day, updated_at: now - 24 * day },
  { id: 'work_mock_003', userid: 'mock_user_001', title: '建筑外观动画', description: '办公楼外观展示，黄昏时段。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_001/work_mock_003.mp4', file_name: 'works/mock_user_001/work_mock_003.mp4', file_size: 31457280, file_type: 'video/mp4', creator_name: '张三', created_at: now - 22 * day, updated_at: now - 22 * day },
  { id: 'work_mock_004', userid: 'mock_user_003', title: '园林景观漫游', description: '中式园林，四季植被与水体。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_003/work_mock_004.mp4', file_name: 'works/mock_user_003/work_mock_004.mp4', file_size: 52428800, file_type: 'video/mp4', creator_name: '王五', created_at: now - 18 * day, updated_at: now - 18 * day },
  { id: 'work_mock_005', userid: 'mock_user_004', title: '商业街人视点', description: '商业街区日景，人流与店铺。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_004/work_mock_005.mp4', file_name: 'works/mock_user_004/work_mock_005.mp4', file_size: 41943040, file_type: 'video/mp4', creator_name: '赵六', created_at: now - 12 * day, updated_at: now - 12 * day },
  { id: 'work_mock_006', userid: 'mock_user_005', title: '别墅室内外', description: '独栋别墅，室内外一体化展示。', file_url: 'https://example-bucket.oss-cn-hangzhou.aliyuncs.com/works/mock_user_005/work_mock_006.mp4', file_name: 'works/mock_user_005/work_mock_006.mp4', file_size: 62914560, file_type: 'video/mp4', creator_name: '钱七', created_at: now - 5 * day, updated_at: now - 5 * day },
];

// 投票：用户 -> 作品（每人投几票，符合 max_votes_per_user=1 则每人每作品一票）
const mockVotes = [
  { work_id: 'work_mock_001', user_id: 'mock_user_002', created_at: now - 27 * day },
  { work_id: 'work_mock_001', user_id: 'mock_user_003', created_at: now - 26 * day },
  { work_id: 'work_mock_001', user_id: 'mock_user_004', created_at: now - 25 * day },
  { work_id: 'work_mock_002', user_id: 'mock_user_001', created_at: now - 23 * day },
  { work_id: 'work_mock_002', user_id: 'mock_user_004', created_at: now - 22 * day },
  { work_id: 'work_mock_003', user_id: 'mock_user_002', created_at: now - 21 * day },
  { work_id: 'work_mock_003', user_id: 'mock_user_005', created_at: now - 20 * day },
  { work_id: 'work_mock_004', user_id: 'mock_user_001', created_at: now - 17 * day },
  { work_id: 'work_mock_004', user_id: 'mock_user_002', created_at: now - 16 * day },
  { work_id: 'work_mock_005', user_id: 'mock_user_003', created_at: now - 11 * day },
  { work_id: 'work_mock_006', user_id: 'mock_user_001', created_at: now - 4 * day },
  { work_id: 'work_mock_006', user_id: 'mock_user_002', created_at: now - 3 * day },
  { work_id: 'work_mock_006', user_id: 'mock_user_004', created_at: now - 2 * day },
];

// 评委评分（评委用邮箱，作品 id + 分数）
const mockJudgeScores = [
  { work_id: 'work_mock_001', judge_email: 'judge_a@example.com', score: 85, created_at: now - 26 * day },
  { work_id: 'work_mock_001', judge_email: 'judge_b@example.com', score: 88, created_at: now - 26 * day },
  { work_id: 'work_mock_002', judge_email: 'judge_a@example.com', score: 90, created_at: now - 23 * day },
  { work_id: 'work_mock_002', judge_email: 'judge_b@example.com', score: 82, created_at: now - 23 * day },
  { work_id: 'work_mock_003', judge_email: 'judge_a@example.com', score: 78, created_at: now - 21 * day },
  { work_id: 'work_mock_004', judge_email: 'judge_a@example.com', score: 92, created_at: now - 17 * day },
  { work_id: 'work_mock_005', judge_email: 'judge_b@example.com', score: 86, created_at: now - 11 * day },
  { work_id: 'work_mock_006', judge_email: 'judge_a@example.com', score: 88, created_at: now - 4 * day },
  { work_id: 'work_mock_006', judge_email: 'judge_b@example.com', score: 91, created_at: now - 4 * day },
];

function seed() {
  const db = getDb();
  const insUser = db.prepare(
    'INSERT OR IGNORE INTO users (userid, name, avatar, mobile, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insWork = db.prepare(
    'INSERT OR IGNORE INTO works (id, userid, title, description, file_url, file_name, file_size, file_type, creator_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insVote = db.prepare(
    'INSERT OR IGNORE INTO votes (work_id, user_id, created_at) VALUES (?, ?, ?)'
  );
  const insJudge = db.prepare(
    'INSERT OR IGNORE INTO judge_scores (work_id, judge_email, score, created_at) VALUES (?, ?, ?, ?)'
  );

  mockUsers.forEach((u) => insUser.run(u.userid, u.name, u.avatar, u.mobile, u.email, u.role, u.created_at));
  console.log('Users: inserted', mockUsers.length, 'rows (INSERT OR IGNORE)');

  mockWorks.forEach((w) => insWork.run(w.id, w.userid, w.title, w.description, w.file_url, w.file_name, w.file_size, w.file_type, w.creator_name, w.created_at, w.updated_at));
  console.log('Works: inserted', mockWorks.length, 'rows (INSERT OR IGNORE)');

  mockVotes.forEach((v) => insVote.run(v.work_id, v.user_id, v.created_at));
  console.log('Votes: inserted', mockVotes.length, 'rows (INSERT OR IGNORE)');

  mockJudgeScores.forEach((j) => insJudge.run(j.work_id, j.judge_email, j.score, j.created_at));
  console.log('Judge scores: inserted', mockJudgeScores.length, 'rows (INSERT OR IGNORE)');

  console.log('Seed done.');
}

seed();
