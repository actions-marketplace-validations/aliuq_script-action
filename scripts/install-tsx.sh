#!/bin/bash

# 设置错误时退出
set -e

# 检查是否安装了npm
if ! command -v npm >/dev/null 2>&1; then
  echo "错误: 请先安装 npm"
  exit 1
fi

# 默认版本
DEFAULT_VERSION="latest"
VERSION=${1:-$DEFAULT_VERSION}

# 创建目标目录
TARGET_DIR="./tsx"
mkdir -p "$TARGET_DIR"

# 如果是具体版本号，直接使用，否则进入交互选择
if [ "$VERSION" != "$DEFAULT_VERSION" ]; then
  echo "使用指定版本: $VERSION"
else
  echo "获取可用版本列表..."
  # 创建临时文件存储版本列表
  TEMP_VERSIONS=$(mktemp)
  npm view tsx versions --json | tr -d '[]",' | tr ' ' '\n' | grep -v '^$' >"$TEMP_VERSIONS"

  # 显示版本列表
  echo "可用版本:"
  nl "$TEMP_VERSIONS"

  echo "请选择版本号(输入编号)："
  read -r selection

  # 验证输入是否为数字
  case "$selection" in
  '' | *[!0-9]*)
    rm "$TEMP_VERSIONS"
    echo "错误：请输入有效的数字"
    exit 1
    ;;
  esac

  # 验证数字范围
  total_versions=$(wc -l <"$TEMP_VERSIONS")
  if [ "$selection" -lt 1 ] || [ "$selection" -gt "$total_versions" ]; then
    rm "$TEMP_VERSIONS"
    echo "错误：选择超出范围"
    exit 1
  fi

  # 设置选择的版本
  VERSION=$(sed -n "${selection}p" "$TEMP_VERSIONS")
  rm "$TEMP_VERSIONS"
fi

echo "开始下载 tsx@${VERSION}..."

# 保存当前目录路径
CURRENT_DIR=$(pwd)

# 在临时目录中安装tsx
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# 创建package.json
npm init -y >/dev/null 2>&1
npm install "tsx@${VERSION}" --save-exact
npm install @actions/core @actions/exec zx --save-exact

# 复制需要的文件到目标目录
cp -r node_modules/* "$CURRENT_DIR/$TARGET_DIR/"
cp -r package.json package-lock.json "$CURRENT_DIR/$TARGET_DIR/"

# 清理临时目录
cd "$CURRENT_DIR"
rm -rf "$TEMP_DIR"

echo "tsx@${VERSION} 已成功安装到 $TARGET_DIR 目录"

# 压缩和验证
mkdir -p ./public
ARCHIVE_NAME="./public/$TARGET_DIR.tar.gz"
echo "正在压缩文件到 $ARCHIVE_NAME ..."

# 如果存在旧的压缩文件则删除
[ -f "$ARCHIVE_NAME" ] && rm "$ARCHIVE_NAME"

# 直接在当前目录压缩，使用 -C 选项指定源目录
if ! tar -czf "$ARCHIVE_NAME" -C "$TARGET_DIR" .; then
  echo "压缩失败"
  exit 1
fi

# 验证压缩文件
if [ ! -f "$ARCHIVE_NAME" ]; then
  echo "压缩文件未创建成功"
  exit 1
fi

# 显示压缩文件信息
echo "压缩文件内容:"
tar -tvf "$ARCHIVE_NAME" | head -n 50
echo "..."

# 显示文件大小
FILESIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo "压缩文件大小: $FILESIZE"

# 清理临时目录
rm -rf "$TARGET_DIR"
echo "完成！压缩文件已保存为 $ARCHIVE_NAME"

# 更新 meta.json 文件
META_FILE="./public/meta.json"
echo "更新版本信息..."

# 确保 jq 命令可用
if ! command -v jq >/dev/null 2>&1; then
  echo "警告: jq 未安装，使用备选方案..."
  if [ -f "$META_FILE" ]; then
    sed -i.bak "s/\"tsx\": \".*\"/\"tsx\": \"$VERSION\"/" "$META_FILE" && rm -f "${META_FILE}.bak"
  else
    echo "{\"tsx\": \"$VERSION\"}" >"$META_FILE"
  fi
else
  # 使用临时文件确保原子性写入
  TEMP_META=$(mktemp)

  if [ -f "$META_FILE" ]; then
    # 如果文件存在，更新版本号
    jq --arg version "$VERSION" '.tsx = $version' "$META_FILE" >"$TEMP_META" &&
      mv "$TEMP_META" "$META_FILE"
  else
    # 如果文件不存在，创建新的
    echo "{\"tsx\": \"$VERSION\"}" | jq '.' >"$META_FILE"
  fi

  [ -f "$TEMP_META" ] && rm -f "$TEMP_META"
fi

# 验证文件内容
if [ -f "$META_FILE" ]; then
  echo "版本信息已更新到: $META_FILE"
  cat "$META_FILE"
else
  echo "错误: 无法更新版本信息"
  exit 1
fi
