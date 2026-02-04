/**
 * 打包脚本：
 * 1. 进入 frontend-vue 执行 npm run build，将 dist 内容打成 zip（解压后即为 dist 内文件，无 dist 文件夹）
 * 2. 将 server 目录内容打成 zip（解压后即为 data、middleware、routes 等，无 server 文件夹），排除 node_modules
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const archiver = require('archiver');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend-vue');
const distDir = path.join(frontendDir, 'dist');
const serverDir = path.join(rootDir, 'server');
const frontendZip = path.join(rootDir, 'frontend-vue-dist.zip');
const serverZip = path.join(rootDir, 'server-dist.zip');

function zipDirectory(sourceDir, outPath, dataFn) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false, dataFn);
    archive.finalize();
  });
}

(async () => {
  // ---------- 前端 ----------
  console.log('[1/3] 构建前端...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  if (!fs.existsSync(distDir)) {
    console.error('构建后未找到 frontend-vue/dist 目录');
    process.exit(1);
  }

  console.log('[2/3] 压缩 frontend-vue/dist 内容为 zip...');
  const frontendSize = await zipDirectory(distDir, frontendZip, undefined);
  console.log('完成: ' + frontendZip + ' (' + frontendSize + ' bytes)');

  // ---------- 后端 ----------
  if (!fs.existsSync(serverDir)) {
    console.error('未找到 server 目录');
    process.exit(1);
  }

  console.log('[3/3] 压缩 server 内容为 zip（排除 node_modules、.env）...');
  const serverSize = await zipDirectory(serverDir, serverZip, (entryData) => {
    const n = entryData.name;
    if (n.includes('node_modules')) return false;
    if (n === '.env' || n.startsWith('.env.') || n.includes('/.env') || n.endsWith('/.env')) return false;
    return entryData;
  });
  console.log('完成: ' + serverZip + ' (' + serverSize + ' bytes)');
})();
