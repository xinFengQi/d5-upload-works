/**
 * 阿里云 STS 服务：获取临时凭证供前端直传 OSS
 * 需配置 RAM 角色 ARN，且当前 AccessKey 所属 RAM 用户具备 AssumeRole 权限
 */
const Sts = require('@alicloud/sts20150401').default;
const { AssumeRoleRequest } = require('@alicloud/sts20150401');

const DEFAULT_DURATION = 3600; // 1 小时

/**
 * 获取 STS 临时凭证（用于前端直传 OSS）
 * @param {object} config - 含 ALIYUN_OSS_ACCESS_KEY_ID, ALIYUN_OSS_ACCESS_KEY_SECRET, ALIYUN_OSS_REGION, ALIYUN_RAM_ROLE_ARN
 * @returns {Promise<{ accessKeyId: string, accessKeySecret: string, stsToken: string, expiration: string }>}
 */
function maskSecret(s) {
  if (!s || typeof s !== 'string') return '***';
  if (s.length <= 8) return '***';
  return s.slice(0, 4) + '****' + s.slice(-4);
}

async function getStsCredentials(config) {
  const roleArn = config.ALIYUN_RAM_ROLE_ARN;
  if (!roleArn) {
    throw new Error('ALIYUN_RAM_ROLE_ARN 未配置，无法使用前端直传。请在阿里云 RAM 创建角色并配置信任与 OSS 权限后设置该环境变量。');
  }
  const accessKeyId = config.ALIYUN_OSS_ACCESS_KEY_ID;
  const accessKeySecret = config.ALIYUN_OSS_ACCESS_KEY_SECRET;
  const regionId = config.ALIYUN_OSS_REGION || 'cn-hangzhou';
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('阿里云 OSS AccessKey 未配置');
  }

  const roleSessionName = `oss-upload-${Date.now()}`;
  const clientConfig = {
    accessKeyId,
    accessKeySecret: maskSecret(accessKeySecret),
    endpoint: 'sts.cn-hangzhou.aliyuncs.com',
    regionId,
  };
  const requestParams = {
    roleArn,
    roleSessionName,
    durationSeconds: DEFAULT_DURATION,
  };
  console.log('[STS] 入参 config:', {
    ALIYUN_RAM_ROLE_ARN: roleArn,
    ALIYUN_OSS_ACCESS_KEY_ID: accessKeyId,
    ALIYUN_OSS_ACCESS_KEY_SECRET: maskSecret(accessKeySecret),
    ALIYUN_OSS_REGION: regionId,
  });
  console.log('[STS] Sts 客户端配置（密钥已脱敏）:', clientConfig);
  console.log('[STS] AssumeRole 请求参数:', requestParams);

  const client = new Sts({
    accessKeyId,
    accessKeySecret,
    endpoint: 'sts.cn-hangzhou.aliyuncs.com',
    regionId,
  });

  const request = new AssumeRoleRequest({
    roleArn,
    roleSessionName,
    durationSeconds: DEFAULT_DURATION,
  });

  const response = await client.assumeRole(request);
  const cred = response?.body?.credentials;
  if (!cred || !cred.accessKeyId || !cred.accessKeySecret || !cred.securityToken) {
    throw new Error('STS 返回的凭证不完整');
  }
  console.log('[STS] 返回凭证摘要:', {
    accessKeyId: cred.accessKeyId,
    accessKeySecret: maskSecret(cred.accessKeySecret),
    stsToken: cred.securityToken ? maskSecret(cred.securityToken) : undefined,
    expiration: cred.expiration,
  });
  return {
    accessKeyId: cred.accessKeyId,
    accessKeySecret: cred.accessKeySecret,
    stsToken: cred.securityToken,
    expiration: cred.expiration,
  };
}

module.exports = { getStsCredentials };
