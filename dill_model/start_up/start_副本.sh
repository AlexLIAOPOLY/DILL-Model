#!/bin/bash

# Dill模型计算工具 - 一键启动脚本
echo "🚀 正在启动 Dill模型计算工具..."
echo "======================================"

# 进入脚本所在目录
cd "$(dirname "$0")"

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，正在创建..."
    python -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 检查依赖是否安装
echo "📦 检查依赖包..."
if ! python -c "import flask" 2>/dev/null; then
    echo "📥 安装依赖包..."
    pip install -r requirements.txt
fi

echo "✅ 环境检查完成"
echo "======================================"

# 启动应用
echo "🌐 启动Web服务器..."
echo "📱 访问地址: http://127.0.0.1:8080"
echo "💡 按 Ctrl+C 停止服务器"
echo "======================================"

# 运行应用（会自动打开浏览器）
python run.py --port 8080

echo "👋 感谢使用 Dill模型计算工具！" 