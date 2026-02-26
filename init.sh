#!/bin/bash
# 初始化并启动「故事转视频」开发环境

set -e
cd "$(dirname "$0")/story-to-video-app"

echo "Installing dependencies..."
npm install

echo "Starting dev server at http://localhost:3000 ..."
npm run dev
