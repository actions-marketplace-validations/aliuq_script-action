#!/bin/bash

echo "#Building on Node……\n"
bun build ./src/index.ts \
    --outdir ./dist \
    --target node \
    --minify \
    --format esm \
    --sourcemap=linked \
    --define "MY_BUILD_MODE='node'" \
    --watch

# echo
# echo "#Building on Bun……\n"
# bun build ./src/index.ts \
#     --outdir ./dist \
#     --target bun \
#     --minify \
#     --format esm \
#     --sourcemap=linked \
#     --entry-naming "[dir]/bun.[ext]" \
#     --define "MY_BUILD_MODE='bun'"
