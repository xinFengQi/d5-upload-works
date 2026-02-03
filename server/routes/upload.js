/**
 * 文件上传路由：支持后端中转上传 + 前端直传 OSS 后“完成上报”
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getDb } = require('../db');
const { OSSService } = require('../services/oss');
const { getStsCredentials } = require('../services/sts');
const { generateToken } = require('../utils/crypto');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { requireUser } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

const MAX_DESCRIPTION_LENGTH = 500;

/** 获取 STS 临时凭证（前端直传 OSS 使用） */
router.get('/sts-credentials', requireUser, async (req, res) => {
  try {
    const config = req.app.locals.config;
    const cred = await getStsCredentials(config);
    const region = config.ALIYUN_OSS_REGION;
    const bucket = config.ALIYUN_OSS_BUCKET;
    sendJson(res, createSuccessResponse({
      ...cred,
      region,
      bucket,
    }));
  } catch (err) {
    console.error('STS credentials error:', err.message);
    sendJson(res, createErrorResponse(err.message || '获取上传凭证失败', 'STS_ERROR', 500));
  }
});

/** 前端直传 OSS 完成后上报：仅保存作品信息，不传文件 */
router.post('/complete', requireUser, express.json(), async (req, res) => {
  try {
    const title = req.body?.title?.trim();
    let description = req.body?.description?.trim() || null;
    const fileUrl = req.body?.fileUrl;
    const fileName = req.body?.fileName;
    const fileSize = req.body?.fileSize;
    const fileType = req.body?.fileType;

    if (!title) {
      return sendJson(res, createErrorResponse('Title is required', 'NO_TITLE', 400));
    }
    if (description != null && description.length > MAX_DESCRIPTION_LENGTH) {
      return sendJson(res, createErrorResponse(`描述最多 ${MAX_DESCRIPTION_LENGTH} 字`, 'DESCRIPTION_TOO_LONG', 400));
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      return sendJson(res, createErrorResponse('fileUrl is required', 'NO_FILE_URL', 400));
    }
    if (!fileName || typeof fileName !== 'string') {
      return sendJson(res, createErrorResponse('fileName is required', 'NO_FILE_NAME', 400));
    }
    const size = Number(fileSize);
    const type = String(fileType || 'video/mp4').trim();
    if (Number.isNaN(size) || size < 0 || size > MAX_SIZE) {
      return sendJson(res, createErrorResponse('无效的 fileSize', 'INVALID_FILE_SIZE', 400));
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return sendJson(res, createErrorResponse('不支持的文件类型', 'INVALID_FILE_TYPE', 400));
    }

    const config = req.app.locals.config;
    try {
      const u = new URL(fileUrl);
      const ok = u.protocol === 'https:' &&
        u.hostname.endsWith('.aliyuncs.com') &&
        (u.hostname === `${config.ALIYUN_OSS_BUCKET}.${config.ALIYUN_OSS_REGION}.aliyuncs.com` || u.hostname.startsWith(`${config.ALIYUN_OSS_BUCKET}.`));
      if (!ok) {
        return sendJson(res, createErrorResponse('fileUrl 必须为本项目 OSS 地址', 'INVALID_FILE_URL', 400));
      }
    } catch (_) {
      return sendJson(res, createErrorResponse('fileUrl 格式无效', 'INVALID_FILE_URL', 400));
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM works WHERE LOWER(TRIM(title)) = LOWER(?)').get(title);
    if (existing) {
      return sendJson(res, createErrorResponse(`作品标题"${title}"已存在，请使用其他标题`, 'DUPLICATE_TITLE', 400));
    }

    const workId = `work_${Date.now()}_${generateToken().slice(0, 8)}`;
    const now = Date.now();
    const work = {
      id: workId,
      userid: req.user.userid,
      title,
      description: description || null,
      file_url: fileUrl,
      file_name: fileName,
      file_size: size,
      file_type: type,
      creator_name: req.user.name,
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      'INSERT INTO works (id, userid, title, description, file_url, file_name, file_size, file_type, creator_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      work.id, work.userid, work.title, work.description, work.file_url, work.file_name, work.file_size, work.file_type,
      work.creator_name, work.created_at, work.updated_at
    );

    sendJson(res, createSuccessResponse({
      id: work.id,
      title: work.title,
      description: work.description,
      fileUrl: work.file_url,
      fileName: work.file_name,
      createdAt: work.created_at,
    }));
  } catch (err) {
    console.error('Upload complete error:', err);
    sendJson(res, createErrorResponse('保存作品失败', 'UPLOAD_COMPLETE_ERROR', 500));
  }
});

router.post('/', requireUser, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const title = req.body?.title?.trim();
    let description = req.body?.description?.trim() || null;

    if (!file) {
      return sendJson(res, createErrorResponse('No file provided', 'NO_FILE', 400));
    }
    if (!title) {
      return sendJson(res, createErrorResponse('Title is required', 'NO_TITLE', 400));
    }
    if (description != null && description.length > MAX_DESCRIPTION_LENGTH) {
      return sendJson(res, createErrorResponse(`描述最多 ${MAX_DESCRIPTION_LENGTH} 字`, 'DESCRIPTION_TOO_LONG', 400));
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return sendJson(res, createErrorResponse('Invalid file type. Only MP4, MOV, and AVI are allowed', 'INVALID_FILE_TYPE', 400));
    }
    if (file.size > MAX_SIZE) {
      return sendJson(res, createErrorResponse('File size exceeds 100MB', 'FILE_TOO_LARGE', 400));
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM works WHERE LOWER(TRIM(title)) = LOWER(?)').get(title);
    if (existing) {
      return sendJson(res, createErrorResponse(`作品标题"${title}"已存在，请使用其他标题`, 'DUPLICATE_TITLE', 400));
    }

    const workId = `work_${Date.now()}_${generateToken().slice(0, 8)}`;
    const ext = (file.originalname.split('.').pop() || 'mp4').toLowerCase();
    const ossKey = `works/${req.user.userid}/${workId}.${ext}`;

    const oss = new OSSService(req.app.locals.config);
    let fileUrl;
    try {
      fileUrl = await oss.uploadFile(file.buffer, ossKey, file.mimetype);
    } catch (err) {
      console.error('OSS upload error:', err);
      return sendJson(res, createErrorResponse(err.message || 'OSS upload failed', 'OSS_UPLOAD_ERROR', 500));
    }

    const now = Date.now();
    const work = {
      id: workId,
      userid: req.user.userid,
      title,
      description: description || null,
      file_url: fileUrl,
      file_name: ossKey,
      file_size: file.size,
      file_type: file.mimetype,
      creator_name: req.user.name,
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      'INSERT INTO works (id, userid, title, description, file_url, file_name, file_size, file_type, creator_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      work.id, work.userid, work.title, work.description, work.file_url, work.file_name, work.file_size, work.file_type,
      work.creator_name, work.created_at, work.updated_at
    );

    sendJson(res, createSuccessResponse({
      id: work.id,
      title: work.title,
      description: work.description,
      fileUrl: work.file_url,
      fileName: work.file_name,
      createdAt: work.created_at,
    }));
  } catch (err) {
    console.error('Upload error:', err);
    sendJson(res, createErrorResponse('Failed to upload file', 'UPLOAD_ERROR', 500));
  }
});

module.exports = router;
