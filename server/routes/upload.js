/**
 * 文件上传路由
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getDb } = require('../db');
const { OSSService } = require('../services/oss');
const { generateToken } = require('../utils/crypto');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { requireUser } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

router.post('/', requireUser, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const title = req.body?.title?.trim();

    if (!file) {
      return sendJson(res, createErrorResponse('No file provided', 'NO_FILE', 400));
    }
    if (!title) {
      return sendJson(res, createErrorResponse('Title is required', 'NO_TITLE', 400));
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
      file_url: fileUrl,
      file_name: ossKey,
      file_size: file.size,
      file_type: file.mimetype,
      creator_name: req.user.name,
      created_at: now,
      updated_at: now,
    };
    db.prepare(
      'INSERT INTO works (id, userid, title, file_url, file_name, file_size, file_type, creator_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      work.id, work.userid, work.title, work.file_url, work.file_name, work.file_size, work.file_type,
      work.creator_name, work.created_at, work.updated_at
    );

    sendJson(res, createSuccessResponse({
      id: work.id,
      title: work.title,
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
