/**
 * 文件上传相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { KVService } from '../services/kv';
import { generateToken } from '../utils/crypto';
import type { UserSession, DingTalkUser } from '../types/user';
import type { Work } from '../types/work';

/**
 * 验证用户身份
 */
async function verifyUser(request: Request, kvService: KVService): Promise<DingTalkUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await kvService.get<UserSession>(`session:${token}`);

  if (!session) {
    return null;
  }

  // 检查 token 是否过期
  if (session.expiresAt < Date.now()) {
    await kvService.delete(`session:${token}`);
    return null;
  }

  return session.userInfo;
}

/**
 * 生成模拟的文件 URL（开发环境使用）
 */
function generateMockFileUrl(fileName: string, fileType: string): string {
  // 生成一个模拟的文件 URL
  // 在实际环境中，这应该是 OSS 的 URL
  const timestamp = Date.now();
  const fileId = generateToken().substring(0, 16);
  const extension = fileName.split('.').pop() || 'mp4';
  
  // 使用一个公开的视频 URL 作为示例，或者返回一个占位符 URL
  // 这里返回一个可以用于测试的 URL
  return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`;
}

export async function handleUploadRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const kvService = new KVService(env.MY_KV);

  // 上传文件
  if (path === '/api/upload' && method === 'POST') {
    try {
      // 1. 验证用户身份
      const userInfo = await verifyUser(request, kvService);
      if (!userInfo) {
        return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
      }

      // 2. 解析 FormData
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const title = formData.get('title') as string;

      if (!file) {
        return createErrorResponse('No file provided', 'NO_FILE', 400);
      }

      if (!title || !title.trim()) {
        return createErrorResponse('Title is required', 'NO_TITLE', 400);
      }

      // 3. 验证文件类型
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
      if (!allowedTypes.includes(file.type)) {
        return createErrorResponse(
          'Invalid file type. Only MP4, MOV, and AVI are allowed',
          'INVALID_FILE_TYPE',
          400
        );
      }

      // 4. 验证文件大小（100MB）
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        return createErrorResponse('File size exceeds 100MB', 'FILE_TOO_LARGE', 400);
      }

      // 5. 检查标题是否重复
      const trimmedTitle = title.trim();
      const workKeys = await kvService.list('work:');
      
      for (const key of workKeys) {
        const existingWork = await kvService.get<Work>(key);
        if (existingWork && existingWork.title.trim().toLowerCase() === trimmedTitle.toLowerCase()) {
          return createErrorResponse(
            `作品标题"${trimmedTitle}"已存在，请使用其他标题`,
            'DUPLICATE_TITLE',
            400
          );
        }
      }

      // 6. 生成模拟的文件 URL（开发环境）
      // 在实际环境中，这里应该调用 OSS 服务上传文件
      const fileUrl = generateMockFileUrl(file.name, file.type);

      // 7. 创建作品信息
      const workId = `work_${Date.now()}_${generateToken().substring(0, 8)}`;
      const now = Date.now();

      const work: Work = {
        id: workId,
        userId: userInfo.userid,
        title: trimmedTitle,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        createdAt: now,
        updatedAt: now,
        creatorName: userInfo.name,
      };

      // 8. 保存作品到 KV
      await kvService.set(`work:${workId}`, work);

      // 9. 保存用户作品索引（用于快速查询用户的作品列表）
      const userWorksKey = `user_works:${userInfo.userid}`;
      const userWorks = await kvService.get<string[]>(userWorksKey) || [];
      userWorks.push(workId);
      await kvService.set(userWorksKey, userWorks);

      // 10. 保存所有作品索引（用于查询所有作品）
      const allWorksKey = 'all_works';
      const allWorks = await kvService.get<string[]>(allWorksKey) || [];
      allWorks.push(workId);
      await kvService.set(allWorksKey, allWorks);

      console.log('Work uploaded:', work);

      return createSuccessResponse({
        id: work.id,
        title: work.title,
        fileUrl: work.fileUrl,
        fileName: work.fileName,
        createdAt: work.createdAt,
      });
    } catch (error) {
      console.error('Upload error:', error);
      return createErrorResponse('Failed to upload file', 'UPLOAD_ERROR', 500);
    }
  }

  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
