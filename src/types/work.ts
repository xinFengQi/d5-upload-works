/**
 * 作品相关类型定义
 */

export interface Work {
  /** 作品 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 作品标题 */
  title: string;
  /** 作品描述 */
  description?: string;
  /** 文件 URL（OSS 地址） */
  fileUrl: string;
  /** 文件名称 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 文件类型 */
  fileType: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 创作者名称（钉钉昵称） */
  creatorName?: string;
}

export interface CreateWorkRequest {
  /** 作品标题 */
  title: string;
  /** 作品描述 */
  description?: string;
  /** 文件 URL */
  fileUrl: string;
  /** 文件名称 */
  fileName: string;
  /** 文件大小 */
  fileSize: number;
  /** 文件类型 */
  fileType: string;
}

export interface UpdateWorkRequest {
  /** 作品标题 */
  title?: string;
  /** 作品描述 */
  description?: string;
}
