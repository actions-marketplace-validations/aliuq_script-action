#!/bin/bash

# 构建配置
COMMON_BUILD_OPTS=(
  --outdir ./dist
  --format esm
  --sourcemap=linked
)

# 模板文件列表
TEMPLATES=(
  "package.json"
  "tsconfig.json"
  "src/config.ts"
  "src/utils.ts"
  "src/index.ts"
)

# 生成模板定义参数
generate_template_defines() {
  for template in "${TEMPLATES[@]}"; do
    local var_name="TPL_$(echo ${template} | tr '/.-' '_' | tr '[:lower:]' '[:upper:]')"
    echo "--define \"${var_name}='$(cat templates/${template} | base64 -w 0)'\""
  done
}

# 执行构建
build() {
  local target=$1
  local extra_opts=$2
  
  echo -e "#Building for ${target}...\n"
  
  # 组合所有构建参数
  local cmd="bun build ./src/index.ts ${COMMON_BUILD_OPTS[*]}"
  cmd+=" --target $target"
  cmd+=" --define \"MY_BUILD_MODE='$target'\""
  cmd+=" $extra_opts"
  
  echo $cmd

  cmd+=" $(generate_template_defines)"
  
  eval $cmd
}

# 检查并执行构建
if [ "$1" = "watch" ]; then
  build "node" "--watch"
else
  build "node" "--minify"
  echo
  build "bun" "--minify --entry-naming \"[dir]/bun.[ext]\""
fi
