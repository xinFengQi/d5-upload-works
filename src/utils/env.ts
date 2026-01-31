/**
 * 环境变量验证和管理
 */

import type { Env } from '../types/env';

/**
 * 验证必需的环境变量是否存在
 */
export function validateEnv(env: Env): { valid: boolean; missing: string[] } {
  const requiredVars = [
    'ALIYUN_OSS_ACCESS_KEY_ID',
    'ALIYUN_OSS_ACCESS_KEY_SECRET',
    'ALIYUN_OSS_REGION',
    'ALIYUN_OSS_BUCKET',
    'DINGTALK_APP_KEY',
    'DINGTALK_APP_SECRET',
    'DINGTALK_REDIRECT_URI',
    'SESSION_SECRET',
    'ADMIN_PASSWORD',
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!env[varName as keyof Env] || env[varName as keyof Env] === '') {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * 获取环境变量（带默认值）
 */
export function getEnvVar(env: Env, key: keyof Env, defaultValue?: string): string {
  const value = env[key];
  if (!value && defaultValue) {
    return defaultValue;
  }
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value as string;
}
