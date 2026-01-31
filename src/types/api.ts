/**
 * API 响应类型定义
 */

export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: T;
  /** 错误信息 */
  error?: {
    /** 错误消息 */
    message: string;
    /** 错误代码 */
    code: string;
    /** 错误详情 */
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}
