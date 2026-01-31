/**
 * Workers KV 服务封装
 */

import type { KVNamespace } from '@cloudflare/workers-types';

export class KVService {
  constructor(private kv: KVNamespace) {}

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: any, expirationTtl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.kv.put(key, stringValue, { expirationTtl });
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  /**
   * 列出所有键
   */
  async list(prefix?: string): Promise<string[]> {
    const options: { prefix?: string } = {};
    if (prefix) {
      options.prefix = prefix;
    }

    const keys: string[] = [];
    let cursor: string | undefined;
    let listComplete = false;

    do {
      const result = await this.kv.list({ ...options, cursor });
      keys.push(...result.keys.map((k) => k.name));
      listComplete = result.list_complete;
      // @ts-ignore - cursor 可能不存在于某些类型定义中
      cursor = result.cursor;
    } while (cursor && !listComplete);

    return keys;
  }
}
