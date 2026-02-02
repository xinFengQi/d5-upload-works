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

/**
 * 判断是否为开发环境
 * 支持多种判断方式（按优先级）：
 * 1. 检查 ENVIRONMENT 环境变量（如果设置了）
 * 2. 检查请求 URL 的 hostname（localhost 或 127.0.0.1）
 * 3. 检查 DINGTALK_REDIRECT_URI 是否包含 localhost
 * 4. 检查钉钉配置是否为默认值（后备方案）
 */
export function isDevelopment(
  env: Env,
  request?: Request
): boolean {
  // 方式1：检查 ENVIRONMENT 环境变量（最明确）
  if (env.ENVIRONMENT) {
    return env.ENVIRONMENT.toLowerCase() === 'development' || 
           env.ENVIRONMENT.toLowerCase() === 'dev';
  }

  // 方式2：检查请求 URL 的 hostname（最可靠）
  if (request) {
    try {
      const url = new URL(request.url);
      const hostname = url.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname.startsWith('localhost:') ||
          hostname.startsWith('127.0.0.1:')) {
        return true;
      }
    } catch (error) {
      // URL 解析失败，继续其他判断方式
    }
  }

  // 方式3：检查 DINGTALK_REDIRECT_URI 是否包含 localhost
  if (env.DINGTALK_REDIRECT_URI) {
    const redirectUri = env.DINGTALK_REDIRECT_URI.toLowerCase();
    if (redirectUri.includes('localhost') || 
        redirectUri.includes('127.0.0.1') ||
        redirectUri.startsWith('http://localhost') ||
        redirectUri.startsWith('http://127.0.0.1')) {
      return true;
    }
  }

  // 方式4：检查钉钉配置是否为默认值（后备方案）
  if (env.DINGTALK_APP_KEY === 'your_app_key' ||
      env.DINGTALK_APP_KEY === '' ||
      env.DINGTALK_APP_SECRET === 'your_app_secret' ||
      env.DINGTALK_APP_SECRET === '') {
    return true;
  }

  return false;
}
