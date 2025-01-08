#!/bin/bash

# 设置变量
PLATFORM="linux-x64"
PUBLIC_DIR="./public"
META_FILE="$PUBLIC_DIR/meta.json"

# 获取所有可用版本
echo "Fetching available versions..."
VERSIONS=$(curl -s https://api.github.com/repos/oven-sh/bun/releases | grep -oP '"tag_name": "\K(.*)(?=")')

# 显示版本列表供用户选择
echo "Available versions:"
echo "$VERSIONS" | nl

# 让用户选择版本
echo -n "Please select a version number (Enter for latest): "
read choice

if [ -z "$choice" ]; then
    VERSION=$(echo "$VERSIONS" | head -n 1)
    echo "Using latest version: $VERSION"
else
    VERSION=$(echo "$VERSIONS" | sed -n "${choice}p")
    if [ -z "$VERSION" ]; then
        echo "Invalid selection"
        exit 1
    fi
    echo "Selected version: $VERSION"
fi

# 移除版本号中的 bun-v 前缀
VERSION=${VERSION#bun-v}
# 移除版本号中的 v 前缀
VERSION=${VERSION#v}

FILENAME="bun-$PLATFORM.zip"
DOWNLOAD_URL="https://github.com/oven-sh/bun/releases/download/bun-v$VERSION/$FILENAME"

# 下载文件
echo "Downloading Bun v$VERSION..."
curl -L $DOWNLOAD_URL -o "$PUBLIC_DIR/$FILENAME"

# 更新 meta.json
if [ -f "$META_FILE" ]; then
  # 如果文件存在，更新版本信息
  tmp=$(mktemp)
  jq --arg version "$VERSION" '.bun = $version' $META_FILE > "$tmp" && mv "$tmp" $META_FILE
else
  # 如果文件不存在，创建新的 meta.json
  echo "{\"bun\":\"$VERSION\"}" > $META_FILE
fi

echo "Successfully downloaded Bun v$VERSION and updated meta.json"
