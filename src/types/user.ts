/**
 * 用户相关类型定义
 */

export type UserRole = 'user' | 'admin';

export interface DingTalkUser {
  /** 用户 ID */
  userid: string;
  /** 用户名称 */
  name: string;
  /** 头像 URL */
  avatar?: string;
  /** 手机号 */
  mobile?: string;
  /** 邮箱 */
  email?: string;
  /** 用户角色 */
  role?: UserRole;
}

export interface UserSession {
  /** 用户 ID */
  userId: string;
  /** 用户信息 */
  userInfo: DingTalkUser;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
}

export interface AuthToken {
  /** Token 值 */
  token: string;
  /** 过期时间 */
  expiresAt: number;
}
