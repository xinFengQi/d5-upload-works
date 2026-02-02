import request from './request';

/** 上传作品（FormData: file, title） */
export function uploadWork(formData) {
  return request.post('/api/upload', formData).then((res) => res.data);
}
