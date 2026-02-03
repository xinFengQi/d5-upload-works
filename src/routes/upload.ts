/**
 * 文件上传相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { KVService } from '../services/kv';
import { OSSService } from '../services/oss';
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


export async function handleUploadRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const kvService = new KVService(env.MY_KV);
  
  // 调试日志：检查环境变量
  console.log('Upload route - Environment variables check:', {
    hasAccessKeyId: !!env.ALIYUN_OSS_ACCESS_KEY_ID,
    hasAccessKeySecret: !!env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    region: env.ALIYUN_OSS_REGION,
    bucket: env.ALIYUN_OSS_BUCKET,
    accessKeyIdPrefix: env.ALIYUN_OSS_ACCESS_KEY_ID ? env.ALIYUN_OSS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'missing',
  });
  
  const ossService = new OSSService(env);

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
      const file = formData.get('file') as unknown as File;
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

      // 4. 验证文件大小（1GB）
      const maxSize = 1024 * 1024 * 1024; // 1GB
      if (file.size > maxSize) {
        return createErrorResponse('File size exceeds 1GB', 'FILE_TOO_LARGE', 400);
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

      // 6. 生成文件在 OSS 中的路径
      // 格式：works/{userId}/{workId}/{filename}
      const workId = `work_${Date.now()}_${generateToken().substring(0, 8)}`;
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const ossKey = `works/${userInfo.userid}/${workId}.${fileExtension}`;

      // 7. 上传文件到 OSS
      let fileUrl: string;
      try {
        fileUrl = await ossService.uploadFile(file, ossKey);
      } catch (ossError: any) {
        console.error('OSS upload error:', ossError);
        
        // 构建错误响应，包含调试信息
        const errorMessage = ossError.message || '未知错误';
        
        // 如果错误包含调试信息，使用它；否则从环境变量中获取配置信息
        let errorDetails = ossError.debugInfo;
        if (!errorDetails) {
          // 从环境变量中获取实际配置值
          errorDetails = {
            originalError: ossError.message || String(ossError),
            bucket: env.ALIYUN_OSS_BUCKET || '未配置',
            region: env.ALIYUN_OSS_REGION || '未配置',
            endpoint: env.ALIYUN_OSS_BUCKET && env.ALIYUN_OSS_REGION 
              ? `${env.ALIYUN_OSS_BUCKET}.${env.ALIYUN_OSS_REGION}.aliyuncs.com`
              : '未配置',
            hasAccessKey: !!env.ALIYUN_OSS_ACCESS_KEY_ID,
            hasSecret: !!env.ALIYUN_OSS_ACCESS_KEY_SECRET,
            accessKeyIdPrefix: env.ALIYUN_OSS_ACCESS_KEY_ID 
              ? env.ALIYUN_OSS_ACCESS_KEY_ID.substring(0, 8) + '...' 
              : 'missing',
          };
        }
        
        // 构建错误响应
        // 注意：在生产环境中，应该只返回必要的错误信息，不包含详细的调试信息
        // 详细的调试信息只在开发环境或通过管理员接口返回
        const isDevelopment = env.ALIYUN_OSS_BUCKET === 'your_bucket_name' || 
                              !env.ALIYUN_OSS_BUCKET || 
                              env.ALIYUN_OSS_BUCKET.includes('your_');
        
        return createErrorResponse(
          errorMessage,
          'OSS_UPLOAD_ERROR',
          500,
          {
            // 只在开发环境返回详细调试信息
            ...(isDevelopment ? {
              debugInfo: errorDetails,
              debug: {
                status: errorDetails.status,
                statusText: errorDetails.statusText,
                error: errorDetails.error,
                url: errorDetails.url,
                resource: errorDetails.resource,
                bucket: errorDetails.bucket || env.ALIYUN_OSS_BUCKET || '未配置',
                region: errorDetails.region || env.ALIYUN_OSS_REGION || '未配置',
                endpoint: errorDetails.endpoint || (env.ALIYUN_OSS_BUCKET && env.ALIYUN_OSS_REGION 
                  ? `${env.ALIYUN_OSS_BUCKET}.${env.ALIYUN_OSS_REGION}.aliyuncs.com`
                  : '未配置'),
                contentType: errorDetails.contentType,
                fileSize: errorDetails.fileSize,
                fileName: errorDetails.fileName,
                hasAccessKey: errorDetails.hasAccessKey !== undefined 
                  ? errorDetails.hasAccessKey 
                  : !!env.ALIYUN_OSS_ACCESS_KEY_ID,
                hasSecret: errorDetails.hasSecret !== undefined 
                  ? errorDetails.hasSecret 
                  : !!env.ALIYUN_OSS_ACCESS_KEY_SECRET,
                accessKeyIdPrefix: errorDetails.accessKeyIdPrefix || (env.ALIYUN_OSS_ACCESS_KEY_ID 
                  ? env.ALIYUN_OSS_ACCESS_KEY_ID.substring(0, 8) + '...' 
                  : 'missing'),
                envBucket: env.ALIYUN_OSS_BUCKET || '未从环境变量读取',
                envRegion: env.ALIYUN_OSS_REGION || '未从环境变量读取',
              }
            } : {
              // 生产环境只返回基本错误信息
              message: '文件上传失败，请稍后重试或联系管理员',
            })
          }
        );
      }

      // 9. 创建作品信息
      const now = Date.now();

      const work: Work = {
        id: workId,
        userId: userInfo.userid,
        title: trimmedTitle,
        fileUrl,
        fileName: ossKey, // 存储 OSS key，用于后续删除
        fileSize: file.size,
        fileType: file.type,
        createdAt: now,
        updatedAt: now,
        creatorName: userInfo.name,
      };

      // 10. 保存作品到 KV
      await kvService.set(`work:${workId}`, work);

      // 11. 保存用户作品索引（用于快速查询用户的作品列表）
      const userWorksKey = `user_works:${userInfo.userid}`;
      const userWorks = await kvService.get<string[]>(userWorksKey) || [];
      userWorks.push(workId);
      await kvService.set(userWorksKey, userWorks);

      // 12. 保存所有作品索引（用于查询所有作品）
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
