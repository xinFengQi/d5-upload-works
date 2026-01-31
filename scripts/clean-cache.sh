#!/bin/bash

echo "正在清理 Wrangler 缓存..."

# 清理 .wrangler 目录
if [ -d ".wrangler" ]; then
    echo "删除 .wrangler 目录..."
    rm -rf .wrangler
    echo "✓ .wrangler 目录已删除"
else
    echo "✓ .wrangler 目录不存在"
fi

# 清理 node_modules/.cache
if [ -d "node_modules/.cache" ]; then
    echo "删除 node_modules/.cache 目录..."
    rm -rf node_modules/.cache
    echo "✓ node_modules/.cache 目录已删除"
else
    echo "✓ node_modules/.cache 目录不存在"
fi

# 清理 TypeScript 构建信息
if ls *.tsbuildinfo 1> /dev/null 2>&1; then
    echo "删除 TypeScript 构建信息..."
    rm -f *.tsbuildinfo
    echo "✓ TypeScript 构建信息已删除"
fi

echo ""
echo "缓存清理完成！"
echo "请重新运行: npm run dev"
