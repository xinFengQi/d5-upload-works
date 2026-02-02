/**
 * 阿里云 OSS 服务（Node 环境，使用 crypto 签名）
 */
const crypto = require('crypto');

class OSSService {
  constructor(config) {
    this.accessKeyId = config.ALIYUN_OSS_ACCESS_KEY_ID;
    this.accessKeySecret = config.ALIYUN_OSS_ACCESS_KEY_SECRET;
    this.region = config.ALIYUN_OSS_REGION;
    this.bucket = config.ALIYUN_OSS_BUCKET;
    this.endpoint = `${this.bucket}.${this.region}.aliyuncs.com`;
  }

  _sign(method, resource, headers = {}) {
    const canonicalizedResource = `/${this.bucket}${resource.startsWith('/') ? resource : '/' + resource}`;
    const ossHeaders = Object.keys(headers)
      .filter((k) => k.toLowerCase().startsWith('x-oss-'))
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');
    const ossHeadersStr = ossHeaders ? `${ossHeaders}\n` : '';
    const stringToSign = [
      method,
      headers['content-md5'] || '',
      headers['content-type'] || '',
      headers['date'] || headers['x-oss-date'] || '',
      ossHeadersStr + canonicalizedResource,
    ].join('\n');
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret)
      .update(stringToSign)
      .digest('base64');
    return `OSS ${this.accessKeyId}:${signature}`;
  }

  async uploadFile(buffer, key, contentType = 'application/octet-stream') {
    const resource = key.startsWith('/') ? key : `/${key}`;
    const date = new Date().toUTCString();
    const headers = { date, 'content-type': contentType };
    const authorization = this._sign('PUT', resource, headers);
    const url = `https://${this.endpoint}${resource}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        Date: date,
        'Content-Type': contentType,
      },
      body: buffer,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OSS upload failed: ${response.status} ${text}`);
    }
    return this.getFileUrl(key);
  }

  async deleteFile(key) {
    const resource = key.startsWith('/') ? key : `/${key}`;
    const date = new Date().toUTCString();
    const authorization = this._sign('DELETE', resource, { date });
    const url = `https://${this.endpoint}${resource}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: authorization, Date: date },
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(`OSS delete failed: ${response.status} ${text}`);
    }
  }

  getFileUrl(key) {
    const clean = key.startsWith('/') ? key.slice(1) : key;
    return `https://${this.endpoint}/${clean}`;
  }
}

module.exports = { OSSService };
