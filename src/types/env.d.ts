/**
 * 环境变量类型定义
 */

import { VoteCounter } from '../durable-objects/vote-counter';

export interface Env {
  // Workers KV 绑定
  MY_KV: KVNamespace;

  // Durable Objects 绑定
  VOTE_COUNTER: DurableObjectNamespace<VoteCounter>;

  // 阿里云 OSS 配置
  ALIYUN_OSS_ACCESS_KEY_ID: string;
  ALIYUN_OSS_ACCESS_KEY_SECRET: string;
  ALIYUN_OSS_REGION: string;
  ALIYUN_OSS_BUCKET: string;

  // 钉钉应用配置
  DINGTALK_APP_KEY: string;
  DINGTALK_APP_SECRET: string;
  DINGTALK_REDIRECT_URI: string;

  // 会话密钥
  SESSION_SECRET: string;

  // 管理员密码
  ADMIN_PASSWORD: string;
}
