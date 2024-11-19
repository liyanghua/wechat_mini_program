#!/bin/bash

# 创建调试配置目录
DEBUG_DIR="/tmp/chrome_debug_profile"
mkdir -p "$DEBUG_DIR"

# Mac的Chrome路径
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

echo "启动Chrome调试模式..."
"$CHROME" \
    --remote-debugging-port=9222 \
    --user-data-dir="$DEBUG_DIR" \
    --disable-gpu-sandbox \
    --no-default-browser-check \
    --window-name="Scraper Chrome"
