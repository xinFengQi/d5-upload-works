# Wrangler 缓存清理脚本

Write-Host "正在清理 Wrangler 缓存..." -ForegroundColor Yellow

# 清理 .wrangler 目录
if (Test-Path ".wrangler") {
    Write-Host "删除 .wrangler 目录..." -ForegroundColor Cyan
    Remove-Item -Path ".wrangler" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ .wrangler 目录已删除" -ForegroundColor Green
} else {
    Write-Host "✓ .wrangler 目录不存在" -ForegroundColor Green
}

# 清理 node_modules/.cache
if (Test-Path "node_modules\.cache") {
    Write-Host "删除 node_modules\.cache 目录..." -ForegroundColor Cyan
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ node_modules\.cache 目录已删除" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules\.cache 目录不存在" -ForegroundColor Green
}

# 清理 TypeScript 构建信息
$tsbuildFiles = Get-ChildItem -Path . -Filter "*.tsbuildinfo" -ErrorAction SilentlyContinue
if ($tsbuildFiles) {
    Write-Host "删除 TypeScript 构建信息..." -ForegroundColor Cyan
    Remove-Item -Path "*.tsbuildinfo" -Force -ErrorAction SilentlyContinue
    Write-Host "✓ TypeScript 构建信息已删除" -ForegroundColor Green
}

Write-Host "`n缓存清理完成！" -ForegroundColor Green
Write-Host "请重新运行: npm run dev" -ForegroundColor Yellow
