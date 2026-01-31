/**
 * 阿里云 OSS 服务封装
 * 在 Workers 环境中，使用 OSS REST API 进行文件操作
 */

import type { Env } from '../types/env';

export class OSSService {
  private accessKeyId: string;
  private accessKeySecret: string;
  private region: string;
  private bucket: string;
  private endpoint: string;

  constructor(env: Env) {
    this.accessKeyId = env.ALIYUN_OSS_ACCESS_KEY_ID;
    this.accessKeySecret = env.ALIYUN_OSS_ACCESS_KEY_SECRET;
    this.region = env.ALIYUN_OSS_REGION;
    this.bucket = env.ALIYUN_OSS_BUCKET;
    this.endpoint = `${this.bucket}.${this.region}.aliyuncs.com`;
    
    // 调试日志：检查环境变量是否被正确读取
    console.log('OSSService initialized with config:', {
      hasAccessKeyId: !!this.accessKeyId,
      hasAccessKeySecret: !!this.accessKeySecret,
      region: this.region,
      bucket: this.bucket,
      endpoint: this.endpoint,
      accessKeyIdPrefix: this.accessKeyId ? this.accessKeyId.substring(0, 8) + '...' : 'missing',
    });
  }

  /**
   * 生成 OSS 签名（符合阿里云 OSS 签名规范）
   * @param method HTTP 方法
   * @param resource 资源路径（不包含 bucket，例如：/key）
   * @param headers 请求头（key 必须小写）
   * @returns 签名字符串
   */
  private async generateSignature(
    method: string,
    resource: string,
    headers: Record<string, string> = {}
  ): Promise<string> {
    // 构建 CanonicalizedResource（格式：/bucket/key）
    // resource 应该已经是 /key 格式，不需要再加 /
    const canonicalizedResource = `/${this.bucket}${resource.startsWith('/') ? resource : '/' + resource}`;

    // 构建 CanonicalizedOSSHeaders（OSS 特定的请求头，以 x-oss- 开头）
    const ossHeaders: string[] = [];
    Object.keys(headers)
      .filter(key => key.toLowerCase().startsWith('x-oss-'))
      .sort()
      .forEach(key => {
        ossHeaders.push(`${key.toLowerCase()}:${headers[key].trim()}`);
      });
    const canonicalizedOSSHeaders = ossHeaders.join('\n');
    const ossHeadersStr = canonicalizedOSSHeaders ? `${canonicalizedOSSHeaders}\n` : '';

    // 构建待签名字符串（按照 OSS 规范）
    // 格式：Method\nContent-MD5\nContent-Type\nDate\nCanonicalizedOSSHeaders\nCanonicalizedResource
    const stringToSign = [
      method,
      headers['content-md5'] || '',
      headers['content-type'] || '',
      headers['date'] || headers['x-oss-date'] || '',
      ossHeadersStr + canonicalizedResource,
    ].join('\n');

    // 使用 HMAC-SHA1 签名
    const encoder = new TextEncoder();
    const key = encoder.encode(this.accessKeySecret);
    const message = encoder.encode(stringToSign);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    // Base64 编码
    const signatureArray = new Uint8Array(signature);
    const signatureString = String.fromCharCode.apply(null, Array.from(signatureArray));
    return btoa(signatureString);
  }

  /**
   * 上传文件到 OSS
   * @param file 文件对象
   * @param key 文件在 OSS 中的路径（例如：works/userId/workId/filename.mp4）
   * @returns 文件 URL
   * @throws 包含调试信息的错误对象
   */
  async uploadFile(file: File, key: string): Promise<string> {
    try {
      // 验证配置
      if (!this.accessKeyId || !this.accessKeySecret || !this.bucket || !this.region) {
        throw new Error('OSS configuration is incomplete. Please check your environment variables.');
      }

      // 读取文件内容
      const fileBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);

      // 构建资源路径（OSS key，不包含 bucket，例如：/works/userId/workId.mp4）
      // key 格式：works/userId/workId.mp4
      const resource = key.startsWith('/') ? key : `/${key}`;

      // 构建请求头（Date 必须是 RFC 822 格式，例如：Wed, 21 Oct 2015 07:28:00 GMT）
      const date = new Date().toUTCString();
      const contentType = file.type || 'application/octet-stream';
      
      // 签名时使用的 headers（key 必须小写，与请求头中的 key 对应）
      const signatureHeaders: Record<string, string> = {
        'date': date,
        'content-type': contentType,
      };

      // 生成签名
      const signature = await this.generateSignature('PUT', resource, signatureHeaders);
      const authorization = `OSS ${this.accessKeyId}:${signature}`;

      // 构建 OSS URL（格式：https://bucket.region.aliyuncs.com/key）
      const url = `https://${this.endpoint}${resource}`;

      // 收集调试信息（包含实际配置值用于调试）
      const debugInfo = {
        url,
        method: 'PUT',
        resource,
        bucket: this.bucket,
        region: this.region,
        endpoint: this.endpoint,
        contentType,
        date,
        fileSize: file.size,
        fileName: file.name,
        hasAccessKey: !!this.accessKeyId,
        hasSecret: !!this.accessKeySecret,
        accessKeyIdPrefix: this.accessKeyId ? this.accessKeyId.substring(0, 8) + '...' : 'missing',
        // 添加实际值用于调试
        bucketValue: this.bucket,
        regionValue: this.region,
        endpointValue: this.endpoint,
      };
      
      // 调试日志：输出实际配置值
      console.log('OSS Upload Debug Info:', {
        bucket: this.bucket,
        region: this.region,
        endpoint: this.endpoint,
        accessKeyIdPrefix: this.accessKeyId ? this.accessKeyId.substring(0, 8) + '...' : 'missing',
      });

      // 发送 PUT 请求上传文件
      // 注意：请求头中的 key 使用标准格式（首字母大写）
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': authorization,
          'Date': date,
          'Content-Type': contentType,
        },
        body: fileData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // 构建包含调试信息的错误对象
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          ...debugInfo,
        };
        
        console.error('OSS upload error details:', errorDetails);
        
        // 创建包含调试信息的错误
        const error: any = new Error(`OSS 上传失败 (${response.status}): ${errorText}`);
        error.debugInfo = errorDetails;
        error.status = response.status;
        
        // 提供更友好的错误信息
        if (response.status === 403) {
          error.message = `OSS 权限错误：请检查 AccessKey 权限和 Bucket 配置`;
        } else if (response.status === 404) {
          error.message = `OSS Bucket 不存在：请检查 Bucket 名称和区域配置`;
        } else {
          error.message = `OSS 上传失败 (${response.status}): ${errorText}`;
        }
        
        throw error;
      }

      // 返回文件访问 URL
      return this.getFileUrl(key);
    } catch (error: any) {
      console.error('OSS upload error:', error);
      // 如果错误已经包含调试信息，直接抛出
      if (error.debugInfo) {
        throw error;
      }
      // 否则包装错误，添加基本调试信息
      const wrappedError: any = new Error(`OSS upload failed: ${error.message || 'Unknown error'}`);
      wrappedError.debugInfo = {
        originalError: error.message || String(error),
        bucket: this.bucket,
        region: this.region,
        endpoint: this.endpoint,
      };
      throw wrappedError;
    }
  }

  /**
   * 删除 OSS 文件
   * @param key 文件在 OSS 中的路径
   */
  async deleteFile(key: string): Promise<void> {
    try {
      // 构建资源路径
      const resource = key.startsWith('/') ? key : `/${key}`;

      // 构建请求头
      const date = new Date().toUTCString();
      const signatureHeaders: Record<string, string> = {
        'date': date,
      };

      // 生成签名
      const signature = await this.generateSignature('DELETE', resource, signatureHeaders);
      const authorization = `OSS ${this.accessKeyId}:${signature}`;

      // 构建 OSS URL
      const url = `https://${this.endpoint}${resource}`;

      // 发送 DELETE 请求
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': authorization,
          'Date': date,
        },
      });

      if (!response.ok && response.status !== 404) {
        // 404 表示文件不存在，可以忽略
        const errorText = await response.text();
        console.error('OSS delete error:', response.status, errorText);
        throw new Error(`OSS delete failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('OSS delete error:', error);
      throw error;
    }
  }

  /**
   * 生成文件访问 URL
   * @param key 文件在 OSS 中的路径
   */
  getFileUrl(key: string): string {
    // 移除开头的 /（如果有）
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    return `https://${this.endpoint}/${cleanKey}`;
  }
}

