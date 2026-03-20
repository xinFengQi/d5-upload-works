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

/** 主奖项：按综合得分（评委评分）排序取前 N，用于主奖项页 */
export function getWorksByJudgeRank(limit = 6) {
  return request.get('/api/works/by-judge-rank', { params: { limit } }).then((res) => res.data);
}

/** 校验作品标题是否可用（上传前调用，避免上传后才发现重复） */
export function checkWorkTitle(title) {
  return request.get('/api/works/check-title', { params: { title: (title || '').trim() } }).then((res) => res.data);
}

/** 删除作品 */
export function deleteWork(id) {
  return request.delete(`/api/works/${id}`).then((res) => res.data);
}

async function blobToApiErrorMessage(blob) {
  try {
    const text = await blob.text();
    const j = JSON.parse(text);
    return j.error?.message || '导出失败';
  } catch {
    return '导出失败，请重试';
  }
}

/** 管理员：下载作品列表 CSV（需 Bearer，服务端含全部作品） */
export async function downloadWorksCsv() {
  try {
    const res = await request.get('/api/works/export', { responseType: 'blob' });
    const ct = (res.headers['content-type'] || '').toLowerCase();
    if (ct.includes('application/json')) {
      throw new Error(await blobToApiErrorMessage(res.data));
    }
    const blob = res.data;
    const cd = res.headers['content-disposition'];
    let filename = `works_export_${new Date().toISOString().slice(0, 10)}.csv`;
    if (cd) {
      const m = /filename\*=UTF-8''([^;\s]+)|filename="([^"]+)"/i.exec(cd);
      if (m) {
        try {
          filename = decodeURIComponent((m[1] || m[2]).replace(/"/g, ''));
        } catch (_) {
          /* keep default */
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      throw new Error(await blobToApiErrorMessage(err.response.data));
    }
    if (err instanceof Error && !err.isAxiosError) throw err;
    throw new Error(err.message || '导出失败，请重试');
  }
}
