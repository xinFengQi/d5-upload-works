import request from './request';

/** 获取 STS 临时凭证（前端直传 OSS 用） */
export function getStsCredentials() {
  return request.get('/api/upload/sts-credentials').then((res) => res.data);
}

/** 前端直传 OSS 完成后上报作品信息 */
export function completeUpload(body) {
  return request.post('/api/upload/complete', body).then((res) => res.data);
}

/**
 * 上传作品（FormData：经后端中转，无 STS 时回退使用）
 * @param {FormData} formData
 * @param {{ onUploadProgress?: (e: { loaded: number; total?: number }) => void }} config - 可选，onUploadProgress 用于进度条
 */
export function uploadWork(formData, config = {}) {
  return request
    .post('/api/upload', formData, {
      ...(config.onUploadProgress && {
        onUploadProgress: (e) => config.onUploadProgress?.(e),
      }),
    })
    .then((res) => res.data);
}
